import { useMemo, useSyncExternalStore } from "react";

/**
 * Pages du site. L'adresse est dans la partie « # » de l'URL (#/annonce/…) : le navigateur n'envoie jamais
 * cette partie au serveur, donc aucune configuration serveur ni retour de Keycloak à adapter,
 * et un lien d'annonce peut être copié et partagé.
 */
export type Route = { name: "home" } | { name: "listing"; id: string };

const LISTING_HASH = /^#\/annonce\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function parseRoute(hash: string): Route {
  const match = LISTING_HASH.exec(hash);

  return match ? { name: "listing", id: match[1] } : { name: "home" };
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
