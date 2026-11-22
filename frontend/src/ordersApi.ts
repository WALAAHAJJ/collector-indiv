import { getToken } from "./auth";

export type OrderStatus = "PAID" | "SHIPPED" | "DELIVERED" | "REFUNDED";

export const orderStatusLabels: Record<OrderStatus, string> = {
  PAID: "Payée, à expédier",
  SHIPPED: "Expédiée",
  DELIVERED: "Reçue",
  REFUNDED: "Remboursée",
};

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
  status: OrderStatus;
  shippedAt: string | null;
  deliveredAt: string | null;
  refundedAt?: string | null;
  paymentId?: string | null;
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

/** Message affiché quand le vendeur ou l'acheteur ne peut pas faire avancer la commande. */
export function trackingErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Session expirée : reconnectez-vous.";
    case 403:
      return "Cette action n’est pas la vôtre : le vendeur expédie, l’acheteur confirme la réception.";
    case 404:
      return "Cette commande est introuvable.";
    case 409:
      return "Cette commande a déjà changé d’étape. Actualisez la liste.";
    default:
      return "Le suivi de commande est momentanément indisponible. Réessayez plus tard.";
  }
}

async function advanceOrder(orderId: string, action: "ship" | "deliver"): Promise<Order> {
  let response: Response;

  try {
    response = await fetch(`${ORDERS_URL}/${encodeURIComponent(orderId)}/${action}`, {
      method: "POST",
      headers: authHeaders(),
    });
  } catch {
    throw new Error("Impossible de contacter le serveur.");
  }

  if (!response.ok) {
    throw new Error(trackingErrorMessage(response.status));
  }

  return (await response.json()) as Order;
}

/** Le vendeur marque la commande expédiée. */
export const shipOrder = (orderId: string) => advanceOrder(orderId, "ship");

/** L'acheteur confirme avoir reçu le colis. */
export const deliverOrder = (orderId: string) => advanceOrder(orderId, "deliver");

/** Télécharge le reçu PDF d'un achat : le jeton part dans l'en-tête, donc on passe par un fichier temporaire. */
export async function downloadReceipt(orderId: string): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${ORDERS_URL}/${encodeURIComponent(orderId)}/receipt`, { headers: authHeaders() });
  } catch {
    throw new Error("Impossible de contacter le serveur.");
  }

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Session expirée : reconnectez-vous."
        : `Le reçu est momentanément indisponible (erreur ${response.status}). Réessayez plus tard.`,
    );
  }

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `recu-${orderId.slice(0, 8)}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const ADMIN_ORDERS_URL = "/api/admin/orders";

/** Toutes les commandes du site (administrateur). */
export const fetchAdminOrders = () => fetchOrders(ADMIN_ORDERS_URL);

/** Message affiché quand un remboursement échoue. */
export function refundErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Session expirée : reconnectez-vous.";
    case 403:
      return "Accès réservé aux administrateurs.";
    case 404:
      return "Cette commande est introuvable.";
    case 409:
      return "Cette commande est déjà remboursée ou n’a pas de paiement à rembourser.";
    default:
      return "Le remboursement est momentanément indisponible. Réessayez plus tard.";
  }
}

/** L'administrateur rembourse une commande. */
export async function refundOrder(orderId: string): Promise<Order> {
  let response: Response;

  try {
    response = await fetch(`${ADMIN_ORDERS_URL}/${encodeURIComponent(orderId)}/refund`, {
      method: "POST",
      headers: authHeaders(),
    });
  } catch {
    throw new Error("Impossible de contacter le serveur.");
  }

  if (!response.ok) {
    throw new Error(refundErrorMessage(response.status));
  }

  return (await response.json()) as Order;
}
