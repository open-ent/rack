import { describe, expect, it, vi } from "vitest";

const http = { isResponseError: vi.fn(), latestResponse: { statusText: "Forbidden" } };
vi.mock("@open-ent/client", () => ({ odeServices: { http: () => http } }));
vi.mock("~/store/configStore", () => ({
  useConfigStore: { getState: () => ({ config: undefined }) },
}));

import { unwrap } from "./rack.service";

describe("unwrap", () => {
  it("renvoie le résultat quand la réponse n'est pas une erreur", async () => {
    http.isResponseError.mockReturnValue(false);
    await expect(unwrap(Promise.resolve({ ok: 1 }))).resolves.toEqual({ ok: 1 });
  });

  it("lève quand la dernière réponse est une erreur (ex. dépôt refusé en 403)", async () => {
    http.isResponseError.mockReturnValue(true);
    await expect(unwrap(Promise.resolve({ error: "refusé" }))).rejects.toThrow("refusé");
  });

  it("utilise le statut HTTP si la réponse n'a pas de message", async () => {
    http.isResponseError.mockReturnValue(true);
    await expect(unwrap(Promise.resolve(undefined))).rejects.toThrow("Forbidden");
  });
});
