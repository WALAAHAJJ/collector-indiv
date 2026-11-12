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
