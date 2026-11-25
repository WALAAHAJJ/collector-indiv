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
    newest: "Nouveautés",
    bargains: "Bonnes affaires",
    sell: "＋ Déposer une annonce",
    hello: "Bonjour",
    myListings: "Mes annonces",
    myOrders: "Mes commandes",
    admin: "Administration",
    logout: "Se déconnecter",
    idleTitle: "Êtes-vous toujours là ?",
    idleText: "Sans activité, vous serez déconnecté(e) dans",
    idleStay: "Rester connecté",
    login: "Se connecter",
    register: "Créer un compte",
    language: "Langue",
    trustPayment: "Paiement sécurisé",
    trustModeration: "Annonces relues par un administrateur",
    trustReviews: "Vendeurs notés par les acheteurs",
    // Accueil et catalogue
    heroEyebrow: "LA COLLECTION A UNE HISTOIRE",
    heroTitleBefore: "Les objets ",
    heroTitleEm: "rares",
    heroTitleAfter: " trouvent leur place.",
    heroText: "Découvrez des pièces uniques proposées par des collectionneurs passionnés.",
    heroExplore: "Explorer le catalogue",
    statListings: "annonces en vente",
    statCategories: "catégories",
    statPayment: "paiement",
    statSecure: "sécurisé",
    featuredEyebrow: "À LA UNE",
    featuredLabel: "À la une : {title}",
    catalogueEyebrow: "LE CATALOGUE",
    catalogueTitle: "À découvrir",
    stepsEyebrow: "EN TROIS GESTES",
    stepsTitle: "Comment ça marche",
    stepFindTitle: "Trouvez",
    stepFindText: "Parcourez le catalogue, filtrez, gardez vos coups de cœur en favoris.",
    stepBuyTitle: "Achetez",
    stepBuyText: "Payez en un clic ; le vendeur est prévenu et prépare l'envoi.",
    stepReceiveTitle: "Recevez et notez",
    stepReceiveText: "Confirmez la réception, puis laissez un avis au vendeur.",
    readGuide: "Lire le mode d'emploi",
    loadingCatalogue: "Chargement du catalogue…",
    catalogueUnavailable: "Le catalogue est momentanément indisponible.",
    noFavorites: "Vous n’avez pas encore de favori : cliquez sur ♡ sur une annonce pour la retrouver ici.",
    noListings: "Aucune annonce approuvée pour le moment.",
    noMatch: "Aucun objet ne correspond à cette recherche.",
    removeFavorite: "Retirer {title} des favoris",
    addFavorite: "Ajouter {title} aux favoris",
    shipping: "Expédition : {amount}",
    seeDetail: "Voir le détail",
    listingSaved: "Annonce enregistrée. Elle apparaît dans le catalogue une fois approuvée.",
    purchaseConfirmed: "Achat confirmé : « {name} », {amount} payés.",
    myAccount: "Mon compte",
    // Filtres et pagination
    minPrice: "Prix min (€)",
    maxPrice: "Prix max (€)",
    condition: "État",
    allConditions: "Tous les états",
    sortBy: "Trier par",
    sortDefault: "Pertinence",
    sortNewest: "Plus récents",
    sortPriceAsc: "Prix croissant",
    sortPriceDesc: "Prix décroissant",
    sortTitle: "Nom (A → Z)",
    conditionNew: "Neuf",
    conditionVeryGood: "Très bon état",
    conditionGood: "Bon état",
    conditionUsed: "État d’usage",
    myFavorites: "Mes favoris ({count})",
    countOne: "{count} annonce",
    countMany: "{count} annonces",
    resetFilters: "Réinitialiser",
    paginationLabel: "Pagination du catalogue",
    previous: "← Précédent",
    next: "Suivant →",
    pageOf: "Page {page} sur {pages}",
    // Pied de page
    footerTagline: "Les belles collections se partagent.",
    footerLabel: "Informations du site",
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
    newest: "New in",
    bargains: "Bargains",
    sell: "＋ Post a listing",
    hello: "Hello",
    myListings: "My listings",
    myOrders: "My orders",
    admin: "Administration",
    logout: "Log out",
    idleTitle: "Are you still there?",
    idleText: "With no activity, you will be logged out in",
    idleStay: "Stay logged in",
    login: "Log in",
    register: "Create an account",
    language: "Language",
    trustPayment: "Secure payment",
    trustModeration: "Every listing reviewed by an admin",
    trustReviews: "Sellers rated by buyers",
    // Accueil et catalogue
    heroEyebrow: "EVERY COLLECTION HAS A STORY",
    heroTitleBefore: "Rare objects ",
    heroTitleEm: "find",
    heroTitleAfter: " their place.",
    heroText: "Discover unique pieces offered by passionate collectors.",
    heroExplore: "Explore the catalogue",
    statListings: "listings for sale",
    statCategories: "categories",
    statPayment: "payment",
    statSecure: "secure",
    featuredEyebrow: "FEATURED",
    featuredLabel: "Featured: {title}",
    catalogueEyebrow: "THE CATALOGUE",
    catalogueTitle: "To discover",
    stepsEyebrow: "IN THREE STEPS",
    stepsTitle: "How it works",
    stepFindTitle: "Find",
    stepFindText: "Browse the catalogue, filter, and keep your favourites.",
    stepBuyTitle: "Buy",
    stepBuyText: "Pay in one click; the seller is notified and prepares the shipment.",
    stepReceiveTitle: "Receive and rate",
    stepReceiveText: "Confirm receipt, then leave the seller a review.",
    readGuide: "Read the guide",
    loadingCatalogue: "Loading the catalogue…",
    catalogueUnavailable: "The catalogue is temporarily unavailable.",
    noFavorites: "You have no favourites yet: click ♡ on a listing to find it here.",
    noListings: "No approved listing at the moment.",
    noMatch: "No item matches this search.",
    removeFavorite: "Remove {title} from favourites",
    addFavorite: "Add {title} to favourites",
    shipping: "Shipping: {amount}",
    seeDetail: "See details",
    listingSaved: "Listing saved. It appears in the catalogue once approved.",
    purchaseConfirmed: "Purchase confirmed: “{name}”, {amount} paid.",
    myAccount: "My account",
    // Filtres et pagination
    minPrice: "Min price (€)",
    maxPrice: "Max price (€)",
    condition: "Condition",
    allConditions: "All conditions",
    sortBy: "Sort by",
    sortDefault: "Relevance",
    sortNewest: "Newest",
    sortPriceAsc: "Price: low to high",
    sortPriceDesc: "Price: high to low",
    sortTitle: "Name (A → Z)",
    conditionNew: "New",
    conditionVeryGood: "Very good condition",
    conditionGood: "Good condition",
    conditionUsed: "Used",
    myFavorites: "My favourites ({count})",
    countOne: "{count} listing",
    countMany: "{count} listings",
    resetFilters: "Reset",
    paginationLabel: "Catalogue pagination",
    previous: "← Previous",
    next: "Next →",
    pageOf: "Page {page} of {pages}",
    // Pied de page
    footerTagline: "Great collections are meant to be shared.",
    footerLabel: "Site information",
  },
} as const;

export type TextVars = Record<string, string | number>;

/** Remplace les {noms} d'un texte par leurs valeurs. */
function fill(text: string, vars?: TextVars): string {
  return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`)) : text;
}

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
  const t = useCallback((key: TextKey, vars?: TextVars): string => fill(TEXTS[language][key], vars), [language]);

  return { language, t };
}
