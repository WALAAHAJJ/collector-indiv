import { getToken } from "./auth";

export type Order = {
  id: string;
  listingId: string;
  listingName: string;
  buyerId: string;
  sellerId: string;
  itemPrice: number;
  shippingCost: number;
  commission: number;
  buyerTotal: number;
  sellerNet: number;
  cardLast4: string;
  createdAt: string;
};

/** Coordonnées de carte saisies par l'acheteur. Elles ne sont envoyées qu'une fois, jamais gardées par le site. */
export type PurchaseInput = {
  listingId: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvc: string;
};

export const ORDERS_URL = "/api/orders";
export const PURCHASES_URL = "/api/orders/purchases";
export const SALES_URL = "/api/orders/sales";

/** Mêmes formats que ceux contrôlés par le serveur (PurchaseRequest) : l'erreur s'affiche avant l'envoi. */
export const CARD_NUMBER_PATTERN = /^[\d -]{13,23}$/;
export const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;
export const CVC_PATTERN = /^\d{3,4}$/;

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Message affiché pour chaque réponse d'erreur de l'API des commandes. */
export function purchaseErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Les informations de la carte sont invalides.";
    case 401:
      return "Session expirée : reconnectez-vous.";
    case 402:
      return "Paiement refusé : numéro de carte invalide, carte expirée ou refusée par la banque. Aucun montant n’a été prélevé.";
    case 403:
      return "Vous ne pouvez pas acheter votre propre annonce.";
    case 404:
      return "Cette annonce n’est plus disponible.";
    case 409:
      return "Cette annonce vient d’être vendue.";
    default:
      return "Le paiement est momentanément indisponible. Réessayez plus tard.";
  }
}

export async function purchase(input: PurchaseInput): Promise<Order> {
  let response: Response;

  try {
    response = await fetch(ORDERS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("Impossible de contacter le serveur.");
  }

  if (!response.ok) {
    throw new Error(purchaseErrorMessage(response.status));
  }

  return (await response.json()) as Order;
}

async function fetchOrders(url: string): Promise<Order[]> {
  const response = await fetch(url, { headers: authHeaders() });

  if (response.status === 401) {
    throw new Error("Session expirée : reconnectez-vous.");
  }

  if (!response.ok) {
    throw new Error("Vos commandes sont momentanément indisponibles.");
  }

  const data: unknown = await response.json();

  return Array.isArray(data) ? (data as Order[]) : [];
}

export const fetchPurchases = () => fetchOrders(PURCHASES_URL);

export const fetchSales = () => fetchOrders(SALES_URL);
