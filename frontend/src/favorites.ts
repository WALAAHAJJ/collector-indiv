import { useCallback, useState } from "react";

const STORAGE_PREFIX = "collector:favoris:";

/** Clé de stockage d'un visiteur non connecté. */
export const VISITOR_KEY = "visiteur";

export function readFavorites(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_PREFIX + key) ?? "[]",
    );

    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    // Stockage indisponible ou contenu illisible : on repart d'une liste vide.
    return [];
  }
}

export function writeFavorites(key: string, ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(ids));
  } catch {
    // Stockage refusé (navigation privée, quota) : les favoris restent valables jusqu'au rechargement.
  }
}

/** Ajoute l'identifiant s'il est absent, le retire sinon, sans modifier la liste d'origine. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

/** Favoris d'un utilisateur, conservés dans ce navigateur (une liste par compte). */
export function useFavorites(key: string) {
  const [state, setState] = useState(() => ({ key, ids: readFavorites(key) }));

  // Changement de compte : on recharge la liste de l'utilisateur pendant le rendu, sans effet.
  if (state.key !== key) {
    setState({ key, ids: readFavorites(key) });
  }

  const ids = state.key === key ? state.ids : readFavorites(key);

  const toggle = useCallback(
    (id: string) => {
      setState((current) => {
        const base = current.key === key ? current.ids : readFavorites(key);
        const next = toggleId(base, id);

        writeFavorites(key, next);

        return { key, ids: next };
      });
    },
    [key],
  );

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, isFavorite, toggle };
}
