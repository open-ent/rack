package fr.wseduc.rack.controllers;

import java.util.Map;

import org.entcore.common.storage.Storage;
import org.entcore.common.user.DefaultFunctions;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;
import org.vertx.java.core.http.RouteMatcher;

import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.rack.Rack;
import fr.wseduc.rs.Delete;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.http.BaseController;
import io.vertx.core.Vertx;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

/**
 * Documents du casier d'un compte, vus par la plate-forme : ce qui occupe son quota côté casier,
 * et la purge.
 *
 * Seuls les documents REÇUS comptent : le casier impute un dépôt au quota du destinataire
 * (`to`), jamais à celui de l'expéditeur. Ce que le compte a déposé chez d'autres leur appartient
 * et n'est ni listé ni supprimé ici.
 *
 * Sécurité sans nouveau workflow : routes AUTHENTICATED puis contrôle manuel de SUPER_ADMIN
 * (même parti pris que UserDocumentsAdminController côté espace documentaire).
 */
public class UserRackAdminController extends BaseController {

	private static final String QUOTA_BUS_ADDRESS = "org.entcore.workspace.quota";

	private final MongoDb mongo = MongoDb.getInstance();
	private final Storage storage;
	private int threshold;

	public UserRackAdminController(Storage storage) {
		this.storage = storage;
	}

	@Override
	public void init(Vertx vertx, JsonObject config, RouteMatcher rm,
			Map<String, fr.wseduc.webutils.security.SecuredAction> securedActions) {
		super.init(vertx, config, rm, securedActions);
		this.threshold = config.getInteger("alertStorage", 80);
	}

	/**
	 * Un identifiant vide est refusé plutôt que traduit en requête : `{to: null}` ou `{}` ferait
	 * porter la purge sur les casiers d'autres comptes.
	 */
	static JsonObject receivedBy(final String userId) {
		if (userId == null || userId.trim().isEmpty()) {
			throw new IllegalArgumentException("user.id.required");
		}
		return new JsonObject().put("to", userId);
	}

	static long totalSize(final JsonArray racks) {
		long size = 0L;
		for (Object o : racks) {
			size += ((JsonObject) o).getJsonObject("metadata", new JsonObject()).getLong("size", 0L);
		}
		return size;
	}

	/** Fichier principal et vignettes de chaque document. */
	static JsonArray storedFiles(final JsonArray racks) {
		final JsonArray files = new JsonArray();
		for (Object o : racks) {
			final JsonObject rack = (JsonObject) o;
			if (rack.getString("file") != null) files.add(rack.getString("file"));
			final JsonObject thumbnails = rack.getJsonObject("thumbnails");
			if (thumbnails != null) {
				for (String key : thumbnails.fieldNames()) {
					if (thumbnails.getValue(key) != null) files.add(thumbnails.getValue(key).toString());
				}
			}
		}
		return files;
	}

	@Get("/admin/user/:userId/documents")
	@SecuredAction(value = "", type = ActionType.AUTHENTICATED)
	public void listUserRacks(final HttpServerRequest request) {
		final String userId = request.params().get("userId");
		UserUtils.getUserInfos(eb, request, user -> {
			if (!isSuperAdmin(user)) { unauthorized(request); return; }
			final JsonObject query;
			try {
				query = receivedBy(userId);
			} catch (IllegalArgumentException e) {
				badRequest(request, e.getMessage());
				return;
			}
			final JsonObject projection = new JsonObject().put("name", 1).put("metadata", 1).put("from", 1)
					.put("fromName", 1).put("sent", 1).put("folder", 1);
			mongo.find(Rack.RACK_COLLECTION, query, null, projection, res -> {
				if (!"ok".equals(res.body().getString("status"))) {
					renderError(request, new JsonObject().put("error", res.body().getString("message")));
					return;
				}
				final JsonArray documents = res.body().getJsonArray("results", new JsonArray());
				renderJson(request, new JsonObject().put("userId", userId).put("files", documents.size())
						.put("size", totalSize(documents)).put("documents", documents));
			});
		});
	}

	@Delete("/admin/user/:userId/documents")
	@SecuredAction(value = "", type = ActionType.AUTHENTICATED)
	public void deleteUserRacks(final HttpServerRequest request) {
		final String userId = request.params().get("userId");
		UserUtils.getUserInfos(eb, request, user -> {
			if (!isSuperAdmin(user)) { unauthorized(request); return; }
			final JsonObject query;
			try {
				query = receivedBy(userId);
			} catch (IllegalArgumentException e) {
				badRequest(request, e.getMessage());
				return;
			}
			final JsonObject projection = new JsonObject().put("file", 1).put("thumbnails", 1).put("metadata", 1);
			mongo.find(Rack.RACK_COLLECTION, query, null, projection, found -> {
				if (!"ok".equals(found.body().getString("status"))) {
					renderError(request, new JsonObject().put("error", found.body().getString("message")));
					return;
				}
				final JsonArray racks = found.body().getJsonArray("results", new JsonArray());
				final JsonObject body = new JsonObject().put("userId", userId).put("files", racks.size())
						.put("size", totalSize(racks));
				if (racks.isEmpty()) { renderJson(request, body); return; }
				// Par identifiants et non par `to` : on ne supprime que ce qu'on vient de mesurer,
				// pas un dépôt arrivé entre la lecture et la suppression (son quota ne serait pas rendu).
				final JsonArray ids = new JsonArray();
				for (Object o : racks) ids.add(((JsonObject) o).getString("_id"));
				final JsonObject byIds = new JsonObject().put("_id", new JsonObject().put("$in", ids));
				mongo.delete(Rack.RACK_COLLECTION, byIds, deleted -> {
					if (!"ok".equals(deleted.body().getString("status"))) {
						log.error("[Rack] Purge du casier de " + userId + " par " + user.getUserId()
								+ " en échec : " + deleted.body().encode());
						renderError(request, new JsonObject().put("error", deleted.body().getString("message")));
						return;
					}
					log.info("[Rack] Purge du casier de " + userId + " par " + user.getUserId() + " : "
							+ racks.size() + " document(s), " + body.getLong("size") + " octet(s)");
					storage.removeFiles(storedFiles(racks), removed -> {
						if (removed == null || !"ok".equals(removed.getString("status"))) {
							log.error("[Rack] Retrait du stockage en échec : "
									+ (removed == null ? "pas de réponse" : removed.encode()));
						}
					});
					updateUserQuota(userId, -1L * body.getLong("size"), () -> renderJson(request, body));
				});
			});
		});
	}

	private void updateUserQuota(final String userId, final long size, final Runnable continuation) {
		if (size == 0L) { continuation.run(); return; }
		final JsonObject message = new JsonObject().put("action", "updateUserQuota").put("userId", userId)
				.put("size", size).put("threshold", threshold);
		eb.<JsonObject>request(QUOTA_BUS_ADDRESS, message, reply -> {
			if (reply.succeeded()) {
				UserUtils.addSessionAttribute(eb, userId, "storage", reply.result().body().getLong("storage"), null);
			} else {
				log.error("[Rack] Quota de " + userId + " non mis à jour", reply.cause());
			}
			continuation.run();
		});
	}

	private boolean isSuperAdmin(final UserInfos user) {
		return user != null && user.getFunctions() != null
				&& user.getFunctions().containsKey(DefaultFunctions.SUPER_ADMIN);
	}

}
