import { afterEach, describe, expect, it, vi } from "vitest";
import { clearToken, setToken } from "../src/auth";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllRead,
  markRead,
  markReadUrl,
} from "../src/notificationsApi";
import { jsonResponse, listingId, mockFetch } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

describe("markReadUrl", () => {
  it("construit l'adresse de marquage", () => {
    expect(markReadUrl(listingId)).toBe(`/api/notifications/${listingId}/read`);
  });

  it("refuse un identifiant qui n'est pas un UUID", () => {
    expect(() => markReadUrl("../x")).toThrow("Identifiant invalide.");
  });
});

describe("fetchNotifications", () => {
  it("envoie le jeton et renvoie la liste", async () => {
    setToken("jeton-123");
    const fetchMock = mockFetch(() =>
      jsonResponse([{ id: listingId, message: "Bonjour", read: false }]),
    );

    const result = await fetchNotifications();

    expect(result).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/notifications");
    expect(init?.headers).toEqual({ Authorization: "Bearer jeton-123" });
  });

  it("renvoie une liste vide si la réponse n'est pas une liste", async () => {
    mockFetch(() => jsonResponse({ oops: true }));

    expect(await fetchNotifications()).toEqual([]);
  });

  it("signale une session expirée (401)", async () => {
    mockFetch(() => new Response(null, { status: 401 }));

    await expect(fetchNotifications()).rejects.toThrow("Session expirée");
  });

  it("signale un service indisponible", async () => {
    mockFetch(() => new Response(null, { status: 503 }));

    await expect(fetchNotifications()).rejects.toThrow("indisponibles");
  });
});

describe("fetchUnreadCount", () => {
  it("lit le compteur", async () => {
    mockFetch(() => jsonResponse({ count: 3 }));

    expect(await fetchUnreadCount()).toBe(3);
  });

  it("vaut 0 quand la réponse est inattendue", async () => {
    mockFetch(() => jsonResponse([]));

    expect(await fetchUnreadCount()).toBe(0);
  });
});

describe("marquage comme lue", () => {
  it("marque une notification avec POST", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}));

    await markRead(listingId);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/notifications/${listingId}/read`);
    expect(init?.method).toBe("POST");
  });

  it("marque tout comme lu avec POST", async () => {
    const fetchMock = mockFetch(() => jsonResponse({ updated: 2 }));

    await markAllRead();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/notifications/read-all");
    expect(init?.method).toBe("POST");
  });
});
