import { getToken } from "./auth";
import { tr, type TextKey } from "./i18n";

export type OrderStatus = "PAID" | "SHIPPED" | "DELIVERED" | "REFUNDED";

export const orderStatusLabels: Record<OrderStatus, string> = {
  PAID: "Payée, à expédier",
  SHIPPED: "Expédiée",
  DELIVERED: "Reçue",
  REFUNDED: "Remboursée",
};

/** Clés de traduction des étapes d'une commande (l'affichage passe par t). */
export const orderStatusKeys: Record<OrderStatus, TextKey> = {
  PAID: "orderPaid",
  SHIPPED: "orderShipped",
  DELIVERED: "orderDelivered",
  REFUNDED: "orderRefunded",
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
      return tr("errCardInfo");
    case 401:
      return tr("errSession");
    case 402:
      return tr("errPay402");
    case 403:
      return tr("errPay403");
    case 404:
      return tr("errPay404");
    case 409:
      return tr("errPay409");
    default:
      return tr("errPayDefault");
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
    throw new Error(tr("errSession"));
  }

  if (!response.ok) {
    throw new Error(tr("errOrdersUnavailable"));
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
      return tr("errSession");
    case 403:
      return tr("errTrack403");
    case 404:
      return tr("errOrderNotFound");
    case 409:
      return tr("errTrack409");
    default:
      return tr("errTrackDefault");
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
        ? tr("errSession")
        : tr("errReceipt", { status: response.status }),
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
      return tr("errSession");
    case 403:
      return tr("errAdminOnly");
    case 404:
      return tr("errOrderNotFound");
    case 409:
      return tr("errRefund409");
    default:
      return tr("errRefundDefault");
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
