const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_SEARCH_LENGTH = 100;

function assertUuid(value: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new Error("Identifiant invalide.");
  }

  return value;
}

export function collectibleUrl(id: string): string {
  return `/api/collectibles/${encodeURIComponent(assertUuid(id))}`;
}

export function myCollectiblesUrl(ownerId: string): string {
  return `/api/collectibles?ownerId=${encodeURIComponent(assertUuid(ownerId))}`;
}

export function catalogUrl(category: string, search: string): string {
  const params = new URLSearchParams();

  if (category) {
    params.set("category", category);
  }

  if (search) {
    params.set("search", search.slice(0, MAX_SEARCH_LENGTH));
  }

  const query = params.toString();

  return query
    ? `/api/collectibles/catalog?${query}`
    : "/api/collectibles/catalog";
}

export const ADMIN_STATUSES = ["PENDING_REVIEW", "APPROVED", "REJECTED"] as const;

export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export function adminListUrl(status: AdminStatus): string {
  if (!ADMIN_STATUSES.includes(status)) {
    throw new Error("Statut invalide.");
  }

  return `/api/admin/collectibles?status=${encodeURIComponent(status)}`;
}

export function adminCollectibleUrl(
  id: string,
  action?: "approve" | "reject",
): string {
  const base = `/api/admin/collectibles/${encodeURIComponent(assertUuid(id))}`;

  return action ? `${base}/${action}` : base;
}

export const CATEGORIES_URL = "/api/categories";

export function adminCategoryUrl(id?: string): string {
  return id
    ? `/api/admin/categories/${encodeURIComponent(assertUuid(id))}`
    : "/api/admin/categories";
}
