import { describe, expect, it } from "vitest";
import {
  adminCollectibleUrl,
  adminListUrl,
  type AdminStatus,
} from "../src/api";

const validId = "123e4567-e89b-42d3-a456-426614174000";

describe("adminListUrl", () => {
  it.each(["PENDING_REVIEW", "APPROVED", "REJECTED"] as const)(
    "construit l’adresse de la liste pour le statut %s",
    (status) => {
      expect(adminListUrl(status)).toBe(
        `/api/admin/collectibles?status=${status}`,
      );
    },
  );

  it("refuse un statut inconnu", () => {
    expect(() => adminListUrl("NIMPORTEQUOI" as AdminStatus)).toThrow(
      "Statut invalide.",
    );
  });
});

describe("adminCollectibleUrl", () => {
  it("construit l’adresse d’une annonce", () => {
    expect(adminCollectibleUrl(validId)).toBe(
      `/api/admin/collectibles/${validId}`,
    );
  });

  it.each(["approve", "reject"] as const)(
    "ajoute l’action %s",
    (action) => {
      expect(adminCollectibleUrl(validId, action)).toBe(
        `/api/admin/collectibles/${validId}/${action}`,
      );
    },
  );

  it("refuse un identifiant qui n’est pas un UUID", () => {
    expect(() => adminCollectibleUrl("../x", "approve")).toThrow(
      "Identifiant invalide.",
    );
  });
});
