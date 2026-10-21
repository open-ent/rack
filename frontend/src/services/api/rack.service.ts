import { odeServices } from "@open-ent/client";
import { RackClient } from "@edifice.io/rack-client-rest";
import {
  CopyToWorkspaceRequestDto,
  SearchUsersQueryDto,
  GetRackQueryDto,
  ListUsersResponseDto,
  UserDto,
  GroupDto,
} from "@edifice.io/rack-client-rest";
import { useConfigStore } from "~/store/configStore";

/**
 * Le client HTTP du socle ne lève pas sur une erreur (400/403/500) : il renvoie
 * la réponse d'erreur, donc un envoi refusé était affiché « réussi ».
 * `unwrap` lève dès que la dernière réponse est une erreur.
 * Ex. : un dépôt refusé en 403 déclenche désormais `onError` et le toast d'échec.
 */
export const unwrap = async <T>(promise: Promise<T>): Promise<T> => {
  const result = await promise;
  const http = odeServices.http();
  if (http.isResponseError()) {
    const message =
      (result as { error?: string } | undefined)?.error ??
      http.latestResponse?.statusText;
    throw new Error(message || "http-error");
  }
  return result;
};

/** Enveloppe le client HTTP pour que chaque appel passe par `unwrap`. */
const strictHttpService = () => {
  const http = odeServices.http();
  return new Proxy(http, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || prop === "isResponseError") {
        return typeof value === "function" ? value.bind(target) : value;
      }
      return (...args: unknown[]) =>
        unwrap(Promise.resolve(value.apply(target, args)));
    },
  });
};

/**
 * Initialize Rack client with config from store
 */
const initializeRackClient = () => {
  const config = useConfigStore.getState().config;
  const baseUrl = config?.api.baseUrl || "/rack";

  return new RackClient({
    httpService: strictHttpService(),
    baseUrl,
  });
};

let rackClient: RackClient | null = null;

const getRackClient = () => {
  if (!rackClient) {
    rackClient = initializeRackClient();
  }
  return rackClient;
};

export const rackService = {
  listRack: () => getRackClient().listRack(),
  getRack: (id: string, query?: GetRackQueryDto) =>
    getRackClient().getRack(id, query),
  deleteRackDocument: (id: string) => getRackClient().deleteRackDocument(id),
  trashRack: (id: string) => getRackClient().trashRack(id),
  recoverRack: (id: string) => getRackClient().recoverRack(id),
  copyToWorkspace: (request: CopyToWorkspaceRequestDto) =>
    getRackClient().copyToWorkspace(request),
  listUsers: () => getRackClient().listUsers(),
  searchUsers: (query: SearchUsersQueryDto) =>
    getRackClient().searchUsers(query),
  listUsersInGroup: (groupId: string) =>
    getRackClient().listUsersInGroup(groupId),
  postRack: (data: {
    file: File;
    recipients: string[];
    application?: string;
  }) => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("users", data.recipients.join(","));
    if (data.application) {
      formData.append("application", data.application);
    }
    return unwrap(
      odeServices.http().postFile("/rack", formData, { headers: {} }),
    );
  },
  postRacks: (data: {
    files: File[];
    recipients: string[];
    application?: string;
  }) => {
    return Promise.all(
      data.files.map((file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("users", data.recipients.join(","));
        if (data.application) {
          formData.append("application", data.application);
        }
        return unwrap(
          odeServices.http().postFile("/rack", formData, { headers: {} }),
        );
      }),
    );
  },
  searchUsersV2: async (): Promise<ListUsersResponseDto> => {
    const response = await unwrap(
      odeServices.http().get(`/communication/visible/search`, {}),
    );
    if (!Array.isArray(response)) {
      throw new Error("Error fetching users" + JSON.stringify(response));
    }
    const data: SearchUsersV2Result[] = response;

    const users: UserDto[] = [];
    const groups: GroupDto[] = [];

    data.forEach((item) => {
      if (item.type === "User") {
        users.push({
          id: item.id,
          displayName: item.displayName,
          username: item.displayName,
          profile: item.profile,
        });
      } else if (item.type === "Group") {
        groups.push({
          id: item.id,
          name: item.displayName,
          structureName: item.structureName ?? undefined,
        });
      }
    });

    return { users, groups };
  },
};

export type SearchUsersV2Result =
  | {
      id: string;
      displayName: string;
      type: "ShareBookmark";
      usedIn: string[];
    }
  | {
      id: string;
      displayName: string;
      structureName: string | null;
      nbUsers: number;
      groupType: string;
      profile: string;
      type: "Group";
      usedIn: string[];
    }
  | {
      id: string;
      displayName: string;
      structureName: string | null;
      profile: string;
      type: "User";
      usedIn: string[];
    };
