import { useEffect, useState } from "react";
import Modal from "./Modal";
import { formatEuros } from "./money";
import { fetchPurchases, fetchSales, type Order } from "./ordersApi";

type Tab = "purchases" | "sales";

const tabs: { id: Tab; label: string }[] = [
  { id: "purchases", label: "Mes achats" },
  { id: "sales", label: "Mes ventes" },
];

const emptyMessages: Record<Tab, string> = {
  purchases: "Vous n’avez encore rien acheté.",
  sales: "Vous n’avez encore rien vendu.",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

type MyOrdersProps = Readonly<{ onClose: () => void }>;

export default function MyOrders({ onClose }: MyOrdersProps) {
  const [tab, setTab] = useState<Tab>("purchases");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (tab === "purchases" ? fetchPurchases() : fetchSales())
      .then((data) => {
        if (!cancelled) {
          setOrders(data);
          setError("");
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setOrders([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Vos commandes sont momentanément indisponibles.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  function changeTab(next: Tab) {
    if (next === tab) return;

    setLoading(true);
    setError("");
    setTab(next);
  }

  function renderOrder(order: Order) {
    return (
      <article className="order-card" key={order.id}>
        <h3>{order.listingName}</h3>
        <span className="order-date">{formatDate(order.createdAt)}</span>

        <dl className="purchase-summary">
          <div>
            <dt>Objet</dt>
            <dd>{formatEuros(order.itemPrice)}</dd>
          </div>
          <div>
            <dt>Expédition</dt>
            <dd>{formatEuros(order.shippingCost)}</dd>
          </div>

          {tab === "purchases" ? (
            <>
              <div className="purchase-total">
                <dt>Total payé</dt>
                <dd>{formatEuros(order.buyerTotal)}</dd>
              </div>
              <div>
                <dt>Carte</dt>
                <dd>•••• {order.cardLast4}</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Commission du site (5 %)</dt>
                <dd>− {formatEuros(order.commission)}</dd>
              </div>
              <div className="purchase-total">
                <dt>Votre gain net</dt>
                <dd>{formatEuros(order.sellerNet)}</dd>
              </div>
            </>
          )}
        </dl>
      </article>
    );
  }

  function renderOrders() {
    if (loading) {
      return <p className="empty-state">Chargement de vos commandes…</p>;
    }

    if (error) {
      return <p role="alert">{error}</p>;
    }

    if (orders.length === 0) {
      return <p className="empty-state">{emptyMessages[tab]}</p>;
    }

    return <div className="orders-list">{orders.map(renderOrder)}</div>;
  }

  return (
    <Modal
      onClose={onClose}
      titleId="my-orders-title"
      backdropClassName="modal-backdrop"
      dialogClassName="listing-modal my-listings-modal"
    >
      <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer">
        ×
      </button>

      <span className="eyebrow">MON ESPACE</span>
      <h2 id="my-orders-title">Mes commandes</h2>

      <fieldset className="filters" aria-label="Type de commandes">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={tab === item.id}
            className={tab === item.id ? "filter selected" : "filter"}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </fieldset>

      {renderOrders()}
    </Modal>
  );
}
