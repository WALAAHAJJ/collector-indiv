import { useEffect, useState } from "react";
import { localeOf, tr, useLanguage } from "./i18n";
import Modal from "./Modal";
import ReviewForm from "./ReviewForm";
import Stars from "./Stars";
import { fetchMyReviews, fetchSellerReviews, type Review } from "./reviewsApi";
import { formatEuros } from "./money";
import {
  deliverOrder,
  downloadReceipt,
  fetchPurchases,
  fetchSales,
  orderStatusKeys,
  shipOrder,
  type Order,
} from "./ordersApi";

type Tab = "purchases" | "sales";

const tabs: { id: Tab; key: "tabPurchases" | "tabSales" }[] = [
  { id: "purchases", key: "tabPurchases" },
  { id: "sales", key: "tabSales" },
];

const emptyKeys = { purchases: "emptyPurchases", sales: "emptySales" } as const;

type MyOrdersProps = Readonly<{ onClose: () => void }>;

export default function MyOrders({ onClose }: MyOrdersProps) {
  const { language, t } = useLanguage();
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(localeOf(language));
  const [tab, setTab] = useState<Tab>("purchases");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  // Avis déjà écrits, par numéro de commande.
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const delivered = orders.filter((item) => item.status === "DELIVERED");
  const needsReviews = delivered.length > 0;
  // Dans « Mes ventes », toutes les commandes ont le même vendeur : l'utilisateur connecté.
  const sellerId = tab === "sales" ? delivered[0]?.sellerId : undefined;

  useEffect(() => {
    if (!needsReviews) return;

    let cancelled = false;

    const request =
      tab === "purchases"
        ? fetchMyReviews()
        : sellerId
          ? fetchSellerReviews(sellerId).then((data) => data?.reviews ?? [])
          : Promise.resolve([]);

    void request.then((found) => {
      if (!cancelled) {
        setReviews(Object.fromEntries(found.map((item) => [item.orderId, item])));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [needsReviews, tab, sellerId]);

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
              : tr("errOrdersUnavailable"),
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
    setActionError("");
    setTab(next);
  }

  /** Remplace la commande mise à jour dans la liste, sans tout recharger. */
  async function advance(order: Order, action: (id: string) => Promise<Order>) {
    setBusyOrderId(order.id);
    setActionError("");

    try {
      const updated = await action(order.id);
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError: unknown) {
      setActionError(
        requestError instanceof Error ? requestError.message : t("errTrackDefault"),
      );
    } finally {
      setBusyOrderId(null);
    }
  }

  async function receipt(order: Order) {
    setBusyOrderId(order.id);
    setActionError("");

    try {
      await downloadReceipt(order.id);
    } catch (requestError: unknown) {
      setActionError(requestError instanceof Error ? requestError.message : t("errGeneric"));
    } finally {
      setBusyOrderId(null);
    }
  }

  function renderAction(order: Order) {
    const busy = busyOrderId === order.id;

    if (tab === "sales" && order.status === "PAID") {
      return (
        <button className="auth-submit order-action" type="button" disabled={busy} onClick={() => void advance(order, shipOrder)}>
          {t("markShipped")}
        </button>
      );
    }

    if (tab === "purchases" && order.status === "SHIPPED") {
      return (
        <button className="auth-submit order-action" type="button" disabled={busy} onClick={() => void advance(order, deliverOrder)}>
          {t("receivedParcel")}
        </button>
      );
    }

    return null;
  }

  /** Sous un achat reçu : l'avis déjà donné, ou le formulaire pour en donner un. */
  function renderReview(order: Order) {
    if (order.status !== "DELIVERED") {
      return null;
    }

    const written = reviews[order.id];

    if (tab === "sales") {
      return written ? (
        <div className="my-review">
          <span>{t("buyerReview")}</span>
          <Stars value={written.rating} />
          {written.comment && <p>{written.comment}</p>}
        </div>
      ) : (
        <p className="my-review-pending">{t("noBuyerReview")}</p>
      );
    }

    if (written) {
      return (
        <div className="my-review">
          <span>{t("yourReview")}</span>
          <Stars value={written.rating} />
          {written.comment && <p>{written.comment}</p>}
        </div>
      );
    }

    return (
      <ReviewForm
        orderId={order.id}
        onSaved={(saved) => setReviews((current) => ({ ...current, [saved.orderId]: saved }))}
      />
    );
  }

  function renderOrder(order: Order) {
    return (
      <article className="order-card" key={order.id}>
        <h3>{order.listingName}</h3>
        <span className="order-date">{formatDate(order.createdAt)}</span>
        <span className={`order-status order-status-${order.status.toLowerCase()}`}>
          {t(orderStatusKeys[order.status])}
        </span>

        <dl className="purchase-summary">
          <div>
            <dt>{t("item")}</dt>
            <dd>{formatEuros(order.itemPrice)}</dd>
          </div>
          <div>
            <dt>{t("shippingShort")}</dt>
            <dd>{formatEuros(order.shippingCost)}</dd>
          </div>

          {tab === "purchases" ? (
            <>
              <div className="purchase-total">
                <dt>{t("totalPaid")}</dt>
                <dd>{formatEuros(order.buyerTotal)}</dd>
              </div>
              <div>
                <dt>{t("card")}</dt>
                <dd>•••• {order.cardLast4}</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>{t("commissionLine")}</dt>
                <dd>− {formatEuros(order.commission)}</dd>
              </div>
              <div className="purchase-total">
                <dt>{t("netGain")}</dt>
                <dd>{formatEuros(order.sellerNet)}</dd>
              </div>
            </>
          )}
        </dl>

        {renderAction(order)}
        {tab === "purchases" && (
          <button className="order-receipt" type="button" disabled={busyOrderId === order.id} onClick={() => void receipt(order)}>
            {t("downloadReceipt")}
          </button>
        )}
        {renderReview(order)}
      </article>
    );
  }

  function renderOrders() {
    if (loading) {
      return <p className="empty-state">{t("loadingOrders")}</p>;
    }

    if (error) {
      return <p role="alert">{error}</p>;
    }

    if (orders.length === 0) {
      return <p className="empty-state">{t(emptyKeys[tab])}</p>;
    }

    return (
      <>
        {actionError && <p role="alert">{actionError}</p>}
        <div className="orders-list">{orders.map(renderOrder)}</div>
      </>
    );
  }

  return (
    <Modal
      onClose={onClose}
      titleId="my-orders-title"
      backdropClassName="modal-backdrop"
      dialogClassName="listing-modal my-listings-modal"
    >
      <button className="modal-close" type="button" onClick={onClose} aria-label={t("close")}>
        ×
      </button>

      <span className="eyebrow">{t("mySpace")}</span>
      <h2 id="my-orders-title">{t("myOrders")}</h2>

      <fieldset className="filters" aria-label={t("orderTypes")}>
        {tabs.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={tab === item.id}
            className={tab === item.id ? "filter selected" : "filter"}
            onClick={() => changeTab(item.id)}
          >
            {t(item.key)}
          </button>
        ))}
      </fieldset>

      {renderOrders()}
    </Modal>
  );
}
