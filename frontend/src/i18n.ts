import { useCallback, useSyncExternalStore } from "react";

export type Language = "fr" | "en";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

/** Textes de l'en-tête et de la navigation, dans chaque langue. */
const TEXTS = {
  fr: {
    categories: "Catégories",
    allCategories: "Toutes les catégories",
    search: "Rechercher un objet, une pièce…",
    searchLabel: "Rechercher un objet",
    howItWorks: "Comment ça marche ?",
    help: "Aide",
    favorites: "Mes favoris",
    catalogue: "Catalogue",
    bargains: "Bonnes affaires",
    sell: "＋ Déposer une annonce",
    hello: "Bonjour",
    myListings: "Mes annonces",
    myOrders: "Mes commandes",
    admin: "Administration",
    logout: "Se déconnecter",
    login: "Se connecter",
    register: "Créer un compte",
    language: "Langue",
    trustPayment: "Paiement sécurisé",
    trustModeration: "Annonces relues par un administrateur",
    trustReviews: "Vendeurs notés par les acheteurs",
  },
  en: {
    categories: "Categories",
    allCategories: "All categories",
    search: "Search an item, a coin…",
    searchLabel: "Search an item",
    howItWorks: "How it works",
    help: "Help",
    favorites: "My favourites",
    catalogue: "Catalogue",
    bargains: "Bargains",
    sell: "＋ Post a listing",
    hello: "Hello",
    myListings: "My listings",
    myOrders: "My orders",
    admin: "Administration",
    logout: "Log out",
    login: "Log in",
    register: "Create an account",
    language: "Language",
    trustPayment: "Secure payment",
    trustModeration: "Every listing reviewed by an admin",
    trustReviews: "Sellers rated by buyers",
  },
} as const;

export type TextKey = keyof (typeof TEXTS)["fr"];

const STORAGE_KEY = "collector.language";
const listeners = new Set<() => void>();

function readLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

let current: Language = readLanguage();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLanguage(language: Language) {
  current = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Le choix reste valable jusqu'au rechargement.
  }
  document.documentElement.lang = language;
  listeners.forEach((listener) => listener());
}

/** Langue choisie et fonction de traduction ; le choix est gardé dans le navigateur. */
export function useLanguage() {
  const language = useSyncExternalStore(subscribe, () => current, () => "fr" as Language);
  const t = useCallback((key: TextKey): string => TEXTS[language][key], [language]);

  return { language, t };
}
