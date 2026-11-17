import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationBell from "../src/NotificationBell";
import { clearToken, setToken } from "../src/auth";
import { jsonResponse, listingId, mockFetch } from "./helpers";

const second = "33333333-3333-4333-8333-333333333333";

const notifications = [
  {
    id: listingId,
    type: "LISTING_APPROVED",
    message: "Votre annonce « Lot de timbres » est en ligne.",
    listingId,
    createdAt: "2026-11-17T08:00:00Z",
    read: false,
  },
  {
    id: second,
    type: "LISTING_REJECTED",
    message: "Votre annonce « Pièce » a été refusée.",
    listingId: second,
    createdAt: "2026-11-16T10:00:00Z",
    read: true,
  },
];

type State = { count: number; list: typeof notifications };

function mockApi(state: State) {
  return mockFetch((url, init) => {
    if (url === "/api/notifications/unread-count") {
      return jsonResponse({ count: state.count });
    }

    if (url === "/api/notifications/read-all") {
      return jsonResponse({ updated: state.count });
    }

    if (url.endsWith("/read") && init?.method === "POST") {
      return jsonResponse({});
    }

    return jsonResponse(state.list);
  });
}

beforeEach(() => setToken("jeton"));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  clearToken();
});

describe("NotificationBell", () => {
  it("affiche le nombre de notifications non lues", async () => {
    mockApi({ count: 3, list: notifications });
    render(<NotificationBell />);

    expect(
      await screen.findByRole("button", { name: "Notifications, 3 non lues" }),
    ).toBeInTheDocument();
  });

  it("n'affiche pas de pastille quand tout est lu", async () => {
    const fetchMock = mockApi({ count: 0, list: notifications });
    render(<NotificationBell />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
  });

  it("utilise le singulier pour une seule notification", async () => {
    mockApi({ count: 1, list: notifications });
    render(<NotificationBell />);

    expect(
      await screen.findByRole("button", { name: "Notifications, 1 non lue" }),
    ).toBeInTheDocument();
  });

  it("garde un compteur à 0 quand le service est indisponible", async () => {
    mockFetch(() => new Response(null, { status: 503 }));
    render(<NotificationBell />);

    expect(
      await screen.findByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
  });

  it("ouvre la liste au clic", async () => {
    mockApi({ count: 1, list: notifications });
    render(<NotificationBell />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Notifications/ }),
    );

    expect(
      await screen.findByText("Votre annonce « Lot de timbres » est en ligne."),
    ).toBeInTheDocument();
    expect(screen.getByText(/« Pièce » a été refusée/)).toBeInTheDocument();
  });

  it("indique l'absence de notification", async () => {
    mockApi({ count: 0, list: [] });
    render(<NotificationBell />);

    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));

    expect(
      await screen.findByText("Aucune notification pour le moment."),
    ).toBeInTheDocument();
  });

  it("affiche l'erreur quand la liste ne se charge pas", async () => {
    mockFetch((url) =>
      url.endsWith("unread-count")
        ? jsonResponse({ count: 0 })
        : new Response(null, { status: 503 }),
    );
    render(<NotificationBell />);

    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("indisponibles");
  });

  it("marque une notification comme lue et décrémente le compteur", async () => {
    const fetchMock = mockApi({ count: 1, list: notifications });
    render(<NotificationBell />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Notifications, 1 non lue" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /Lot de timbres/ }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Notifications" }),
      ).toBeInTheDocument(),
    );
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          url === `/api/notifications/${listingId}/read` &&
          init?.method === "POST",
      ),
    ).toBe(true);
  });

  it("ne rappelle pas le service pour une notification déjà lue", async () => {
    const fetchMock = mockApi({ count: 1, list: notifications });
    render(<NotificationBell />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Notifications/ }),
    );
    await userEvent.click(await screen.findByRole("button", { name: /Pièce/ }));

    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith(`${second}/read`)),
    ).toBe(false);
  });

  it("marque tout comme lu", async () => {
    const fetchMock = mockApi({ count: 1, list: notifications });
    render(<NotificationBell />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Notifications, 1 non lue" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Tout marquer comme lu" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Notifications" }),
      ).toBeInTheDocument(),
    );
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/notifications/read-all"),
    ).toBe(true);
  });

  it("affiche l'erreur si le marquage échoue", async () => {
    mockFetch((url, init) => {
      if (url.endsWith("unread-count")) return jsonResponse({ count: 1 });
      if (init?.method === "POST") return new Response(null, { status: 401 });
      return jsonResponse(notifications);
    });
    render(<NotificationBell />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Notifications/ }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /Lot de timbres/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Session expirée");
  });

  it("affiche l'erreur si « tout marquer comme lu » échoue", async () => {
    mockFetch((url, init) => {
      if (url.endsWith("unread-count")) return jsonResponse({ count: 1 });
      if (init?.method === "POST") return new Response(null, { status: 503 });
      return jsonResponse(notifications);
    });
    render(<NotificationBell />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Notifications/ }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Tout marquer comme lu" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("indisponibles");
  });

  it("se ferme avec Échap et au clic à l'extérieur", async () => {
    mockApi({ count: 0, list: notifications });
    render(
      <div>
        <NotificationBell />
        <p>Dehors</p>
      </div>,
    );

    const bell = screen.getByRole("button", { name: /Notifications/ });

    await userEvent.click(bell);
    expect(await screen.findByRole("region")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();

    await userEvent.click(bell);
    expect(await screen.findByRole("region")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Dehors"));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("se referme quand on clique de nouveau sur la cloche", async () => {
    mockApi({ count: 0, list: notifications });
    render(<NotificationBell />);

    const bell = screen.getByRole("button", { name: /Notifications/ });
    await userEvent.click(bell);
    expect(await screen.findByRole("region")).toBeInTheDocument();
    await userEvent.click(bell);

    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("actualise le compteur toutes les 30 secondes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const state = { count: 0, list: notifications };
    mockApi(state);
    render(<NotificationBell />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Notifications" }),
      ).toBeInTheDocument(),
    );

    state.count = 2;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(
      await screen.findByRole("button", { name: "Notifications, 2 non lues" }),
    ).toBeInTheDocument();
  });

  it("plafonne l'affichage à 99+", async () => {
    mockApi({ count: 150, list: notifications });
    render(<NotificationBell />);

    expect(
      await screen.findByRole("button", { name: "Notifications, 150 non lues" }),
    ).toBeInTheDocument();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
