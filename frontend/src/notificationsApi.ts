import { getToken } from "./auth";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AppNotification = {
  id: string;
  type: string;
  message: string;
  listingId: string | null;
  createdAt: string;
  read: boolean;
};

export const NOTIFICATIONS_URL = "/api/notifications";
export const UNREAD_COUNT_URL = "/api/notifications/unread-count";
export const READ_ALL_URL = "/api/notifications/read-all";

/** Adresse de marquage d'une notification ; l'identifiant est validé avant d'être collé dans l'adresse. */
export function markReadUrl(id: string): string {
  if (!UUID_PATTERN.test(id)) {
    throw new Error("Identifiant invalide.");
  }

  return `${NOTIFICATIONS_URL}/${encodeURIComponent(id)}/read`;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(url: string, method = "GET"): Promise<Response> {
  const response = await fetch(url, { method, headers: authHeaders() });

  if (response.status === 401) {
    throw new Error("Session expirée : reconnectez-vous.");
  }

  if (!response.ok) {
    throw new Error("Les notifications sont indisponibles.");
  }

  return response;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const data: unknown = await (await request(NOTIFICATIONS_URL)).json();

  return Array.isArray(data) ? (data as AppNotification[]) : [];
}

/** Nombre de notifications non lues ; une réponse inattendue vaut 0. */
export async function fetchUnreadCount(): Promise<number> {
  const data = (await (await request(UNREAD_COUNT_URL)).json()) as {
    count?: unknown;
  };

  return typeof data.count === "number" ? data.count : 0;
}

export async function markRead(id: string): Promise<void> {
  await request(markReadUrl(id), "POST");
}

export async function markAllRead(): Promise<void> {
  await request(READ_ALL_URL, "POST");
}
