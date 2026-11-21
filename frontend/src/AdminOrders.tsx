import { useEffect, useState } from "react";
import { formatEuros } from "./money";
import { fetchAdminOrders, orderStatusLabels, refundOrder, type Order } from "./ordersApi";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

/** Back-office : toutes les commandes du site, avec le remboursement. */
export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAdminOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Les commandes sont indisponibles.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function refund(order: Order) {
    if (!window.confirm(`Rembourser la commande « ${order.listingName} » (${formatEuros(order.buyerTotal)}) ?`)) {
      return;
    }

    setBusyId(order.id);
    setError("");
    setMessage("");

    try {
      const updated = await refundOrder(order.id);
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage("Commande remboursée.");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Le remboursement a échoué.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="empty-state">Chargement des commandes…</p>;
  }

  return (
    <>
      {message && <output>{message}</output>}
      {error && <p role="alert">{error}</p>}

      {orders.length === 0 && !error ? (
        <p className="empty-state">Aucune commande pour le moment.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <h3>{order.listingName}</h3>
              <span className="order-date">{formatDate(order.createdAt)}</span>
              <span className={`order-status order-status-${order.status.toLowerCase()}`}>
                {orderStatusLabels[order.status]}
              </span>

              <dl className="purchase-summary">
                <div>
                  <dt>Total payé</dt>
                  <dd>{formatEuros(order.buyerTotal)}</dd>
                </div>
                <div>
                  <dt>Acheteur</dt>
                  <dd>{order.buyerId.slice(0, 8)}…</dd>
                </div>
                <div>
                  <dt>Vendeur</dt>
                  <dd>{order.sellerId.slice(0, 8)}…</dd>
                </div>
              </dl>

              {order.status !== "REFUNDED" && order.paymentId && (
                <button
                  className="auth-submit order-action"
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => void refund(order)}
                >
                  Rembourser
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
