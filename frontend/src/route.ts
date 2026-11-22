import { useMemo, useSyncExternalStore } from "react";

/**
 * Pages du site. L'adresse est dans la partie « # » de l'URL (#/annonce/…) : le navigateur n'envoie jamais
 * cette partie au serveur, donc aucune configuration serveur ni retour de Keycloak à adapter,
 * et un lien d'annonce peut être copié et partagé.
 */
export const INFO_PAGES = ["comment-ca-marche", "faq", "cgu", "contact"] as const;

export type InfoPageSlug = (typeof INFO_PAGES)[number];

export type Route =
  | { name: "home" }
  | { name: "listing"; id: string }
  | { name: "seller"; id: string }
  | { name: "info"; slug: InfoPageSlug };

const UUID = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";
const LISTING_HASH = new RegExp(`^#/annonce/${UUID}$`, "i");
const SELLER_HASH = new RegExp(`^#/vendeur/${UUID}$`, "i");

function isInfoPage(value: string): value is InfoPageSlug {
  return (INFO_PAGES as readonly string[]).includes(value);
}

export function parseRoute(hash: string): Route {
  const match = LISTING_HASH.exec(hash);

  if (match) return { name: "listing", id: match[1] };

  const seller = SELLER_HASH.exec(hash);

  if (seller) return { name: "seller", id: seller[1] };

  const slug = hash.startsWith("#/") ? hash.slice(2) : "";

  return isInfoPage(slug) ? { name: "info", slug } : { name: "home" };
}

export function infoHref(slug: InfoPageSlug): string {
  return `#/${slug}`;
}

export function sellerHref(id: string): string {
  return `#/vendeur/${id}`;
}

export function listingHref(id: string): string {
  return `#/annonce/${id}`;
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);

  return () => window.removeEventListener("hashchange", onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash);

  return useMemo(() => parseRoute(hash), [hash]);
}
