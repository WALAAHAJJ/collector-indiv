import { useCallback, useEffect, useState } from "react";
import { CATEGORIES_URL } from "./api";
import { fallbackCategories, type Category } from "./categories";

/** Lit les catégories ; renvoie `null` si l'API ne répond pas correctement. */
async function fetchCategories(): Promise<Category[] | null> {
  try {
    const response = await fetch(CATEGORIES_URL);

    if (!response.ok) return null;

    const data = (await response.json()) as Category[];

    return Array.isArray(data) && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

/**
 * Charge les catégories depuis l'API. En cas d'échec, la liste par défaut
 * reste affichée pour que le site continue de fonctionner.
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);

  const reload = useCallback(async () => {
    const data = await fetchCategories();

    if (data) {
      setCategories(data);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchCategories().then((data) => {
      if (!cancelled && data) {
        setCategories(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, reload };
}
