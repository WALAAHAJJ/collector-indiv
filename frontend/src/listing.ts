import { photoUrl } from "./api";
import type { CategoryVisual } from "./categories";
import type { TextKey } from "./i18n";

/** Annonce telle que l'API la renvoie. */
export type ApiListing = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  category: string;
  condition: string;
  price: number;
  shippingCost: number;
  hasPhoto?: boolean;
  status?: string;
  /** Date de création (ISO), absente sur d'anciennes réponses. */
  createdAt?: string;
};

/** Annonce prête à afficher (état en français, adresse de la photo). */
export type CatalogListing = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  image: string;
  shippingCost: number;
  sold: boolean;
  /** Date de création en millisecondes (0 si inconnue). */
  createdAt: number;
};

export type Listing = CatalogListing & CategoryVisual;

const conditionLabels: Record<string, string> = {
  new: "Neuf",
  very_good: "Très bon état",
  good: "Bon état",
  used: "État d’usage",
};

export function toCatalogListing(item: ApiListing): CatalogListing {
  return {
    id: item.id,
    ownerId: item.ownerId,
    title: item.name,
    description: item.description ?? "",
    category: item.category,
    condition: conditionLabels[item.condition.toLowerCase()] ?? item.condition,
    price: item.price,
    image: item.hasPhoto ? photoUrl(item.id) : "",
    shippingCost: item.shippingCost,
    sold: item.status === "SOLD",
    createdAt: item.createdAt ? Date.parse(item.createdAt) || 0 : 0,
  };
}

const conditionKeys = {
  "Neuf": "conditionNew",
  "Très bon état": "conditionVeryGood",
  "Bon état": "conditionGood",
  "État d’usage": "conditionUsed",
} as const;

/** État affiché dans la langue choisie ; la valeur interne reste en français (filtres, tests). */
export function conditionText(condition: string, t: (key: TextKey) => string): string {
  const key = (conditionKeys as Record<string, TextKey>)[condition];

  return key ? t(key) : condition;
}

/** Nom affiché pour un vendeur : l'API ne donne que son identifiant, on n'expose pas de compte réel. */
export function sellerLabel(ownerId: string): string {
  return `Collectionneur n° ${ownerId.slice(0, 4).toUpperCase()}`;
}
