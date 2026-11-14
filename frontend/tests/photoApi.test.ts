import { afterEach, describe, expect, it, vi } from "vitest";
import { photoUrl } from "../src/api";
import { setToken } from "../src/auth";
import { removePhoto, uploadPhoto } from "../src/photoApi";
import { jsonResponse, listingId, mockFetch } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe("photoUrl", () => {
  it("construit l’adresse de la photo", () => {
    expect(photoUrl(listingId)).toBe(`/api/collectibles/${listingId}/photo`);
  });

  it("refuse un identifiant qui n’est pas un UUID", () => {
    expect(() => photoUrl("../x")).toThrow("Identifiant invalide.");
  });
});

describe("uploadPhoto", () => {
  it("envoie le fichier avec le jeton, sans fixer le type du corps", async () => {
    setToken("jeton-123");
    const fetchMock = mockFetch(() => jsonResponse({ hasPhoto: true }));
    const file = new File([new Uint8Array(10)], "p.png", { type: "image/png" });

    await uploadPhoto(listingId, file);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/collectibles/${listingId}/photo`);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ Authorization: "Bearer jeton-123" });
    expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it.each([
    [401, "Session expirée"],
    [403, "ne pouvez pas"],
    [413, "dépasse 1 Mo"],
    [400, "Format non pris en charge"],
    [500, "L’envoi de la photo a échoué"],
  ])("explique l’erreur %i", async (status, text) => {
    mockFetch(() => jsonResponse({}, status));

    await expect(
      uploadPhoto(listingId, new File([], "p.png", { type: "image/png" })),
    ).rejects.toThrow(text);
  });
});

describe("removePhoto", () => {
  it("supprime la photo avec le jeton", async () => {
    setToken("jeton-123");
    const fetchMock = mockFetch(() => jsonResponse({ hasPhoto: false }));

    await removePhoto(listingId);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/collectibles/${listingId}/photo`);
    expect(init?.method).toBe("DELETE");
    expect(init?.headers).toEqual({ Authorization: "Bearer jeton-123" });
  });

  it("explique l’échec", async () => {
    mockFetch(() => jsonResponse({}, 500));

    await expect(removePhoto(listingId)).rejects.toThrow("La suppression de la photo a échoué");
  });
});
