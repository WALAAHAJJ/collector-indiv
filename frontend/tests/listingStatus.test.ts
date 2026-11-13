import { describe, expect, it } from "vitest";
import { statusLabels } from "../src/listingStatus";

describe("statusLabels", () => {
  it("donne un libellé lisible à chaque statut", () => {
    expect(statusLabels.PENDING_REVIEW).toBe("En attente de vérification");
    expect(statusLabels.APPROVED).toBe("Approuvée");
    expect(statusLabels.REJECTED).toBe("Refusée");
  });
});
