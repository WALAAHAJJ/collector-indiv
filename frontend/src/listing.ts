import { photoUrl } from "./api";
import type { CategoryVisual } from "./categories";

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
  };
}

/** Nom affiché pour un vendeur : l'API ne donne que son identifiant, on n'expose pas de compte réel. */
export function sellerLabel(ownerId: string): string {
  return `Collectionneur n° ${ownerId.slice(0, 4).toUpperCase()}`;
}
