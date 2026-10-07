/**
 * Substitut local de « @edifice.io/collect-frontend/lib » (application Collecte d'Edifice).
 *
 * Rack 3.2 amont embarque Collecte, mais son backend (API /collections) n'existe pas chez nous
 * et le paquet exige @edifice.io/react 2.6.6, incompatible avec notre @open-ent 2.5.30. Ce module
 * garde le code amont intact : les droits ci-dessous n'existent dans aucun rôle, donc le menu
 * Collecte reste masqué, et les composants n'affichent rien. Pour activer Collecte, retirer
 * l'alias dans vite.config.ts et tsconfig.app.json et rétablir la dépendance.
 */
export const WORKFLOW_RIGHTS = {
  COLLECTION_ACCESS: "fr.openent.rack.collect.disabled|access",
  COLLECTION_CREATE: "fr.openent.rack.collect.disabled|create",
} as const;

export const CollectApp = (_props: { basePath?: string }) => null;
export const CollectMenu = (_props: { showMenu?: boolean; basePath?: string }) => null;
export const CollectAppActionHeader = (_props: { basePath?: string }) => null;
