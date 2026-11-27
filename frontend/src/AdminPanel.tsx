import { useCallback, useEffect, useState, type SyntheticEvent } from "react";
import { adminCollectibleUrl, adminListUrl, type AdminStatus } from "./api";
import { getToken } from "./auth";
import AdminCategories from "./AdminCategories";
import AdminOrders from "./AdminOrders";
import { visualForLabel, type Category } from "./categories";
import { useLanguage, tr } from "./i18n";
import { statusKeys, type ListingStatus } from "./listingStatus";
import ListingPhoto from "./ListingPhoto";
import Modal from "./Modal";
import ObjectArt from "./ObjectArt";

type AdminListing = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  category: string;
  condition: string;
  price: number;
  shippingCost: number;
  status: ListingStatus;
  moderationReason: string | null;
  hasPhoto?: boolean;
};

type AdminPanelProps = Readonly<{
  categories: Category[];
  onCategoriesChange: () => Promise<void> | void;
  onClose: () => void;
}>;

const tabs = [
  { status: "PENDING_REVIEW", key: "tabPending" },
  { status: "APPROVED", key: "tabApproved" },
  { status: "REJECTED", key: "tabRejected" },
] as const;

const emptyKeys = {
  PENDING_REVIEW: "emptyPending",
  APPROVED: "emptyApproved",
  REJECTED: "emptyRejected",
} as const;

function formatEuros(value: number): string {
  return `${Number(value).toFixed(2).replace(".", ",")} €`;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminPanel({
  categories,
  onCategoriesChange,
  onClose,
}: AdminPanelProps) {
  const { t } = useLanguage();
  const [section, setSection] = useState<"listings" | "categories" | "orders">(
    "listings",
  );
  const [status, setStatus] = useState<AdminStatus>("PENDING_REVIEW");
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const loadListings = useCallback(async (): Promise<AdminListing[]> => {
    const response = await fetch(adminListUrl(status), {
      headers: authHeaders(),
    });

    if (response.status === 401) {
      throw new Error(tr("errSession"));
    }

    if (response.status === 403) {
      throw new Error(tr("errAdminOnly"));
    }

    if (!response.ok) {
      throw new Error(tr("errAdminLoad"));
    }

    return (await response.json()) as AdminListing[];
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    loadListings()
      .then((data) => {
        if (!cancelled) {
          setListings(data);
          setError("");
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : tr("errGeneric"),
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
  }, [loadListings]);

  function changeStatus(next: AdminStatus) {
    if (next === status) return;

    setLoading(true);
    setError("");
    setMessage("");
    setRejectingId(null);
    setListings([]);
    setStatus(next);
  }

  async function applyAction(
    request: () => Promise<Response>,
    success: string,
  ) {
    try {
      const response = await request();

      if (response.status === 401) {
        throw new Error(tr("errSession"));
      }

      if (!response.ok) {
        throw new Error(tr("errActionFailed"));
      }

      setListings(await loadListings());
      setRejectingId(null);
      setReason("");
      setError("");
      setMessage(success);
    } catch (requestError: unknown) {
      setMessage("");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "L’action a échoué. Réessayez.",
      );
    }
  }

  function approve(listing: AdminListing) {
    return applyAction(
      () =>
        fetch(adminCollectibleUrl(listing.id, "approve"), {
          method: "POST",
          headers: authHeaders(),
        }),
      t("okApproved"),
    );
  }

  function reject(event: SyntheticEvent<HTMLFormElement>, listing: AdminListing) {
    event.preventDefault();

    if (reason.trim() === "") {
      setError(t("errRejectReason"));
      return Promise.resolve();
    }

    return applyAction(
      () =>
        fetch(adminCollectibleUrl(listing.id, "reject"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ reason: reason.trim() }),
        }),
      t("okRejected"),
    );
  }

  function remove(listing: AdminListing) {
    if (!window.confirm(t("confirmDelete", { name: listing.name }))) {
      return Promise.resolve();
    }

    return applyAction(
      () =>
        fetch(adminCollectibleUrl(listing.id), {
          method: "DELETE",
          headers: authHeaders(),
        }),
      t("listingDeleted"),
    );
  }

  function renderListings() {
    if (loading) {
      return <p className="empty-state">{t("loadingListings")}</p>;
    }

    if (listings.length === 0) {
      return error ? null : (
        <p className="empty-state">{t(emptyKeys[status])}</p>
      );
    }

    return (
      <div className="my-listings-list">
        {listings.map((listing) => {
          const visual = visualForLabel(listing.category, categories);

          return (
            <article className="my-listing-card" key={listing.id}>
              <div className={`my-listing-placeholder ${visual.tone}`}>
                {listing.hasPhoto ? (
                  <ListingPhoto
                    listingId={listing.id}
                    alt={listing.name}
                    className="listing-photo"
                    fallback={<ObjectArt kind={visual.art} size={96} />}
                  />
                ) : (
                  <ObjectArt kind={visual.art} size={96} />
                )}
              </div>

              <div className="my-listing-info">
                <span className="item-category">{listing.category}</span>
                <h3>{listing.name}</h3>
                <p className="admin-owner">
                  {t("sellerLine", { id: listing.ownerId.slice(0, 8) })}
                </p>
                {listing.description && <p>{listing.description}</p>}
                <p>{t("priceLine", { amount: formatEuros(listing.price) })}</p>
                <p>{t("shipping", { amount: formatEuros(listing.shippingCost) })}</p>
                <span
                  className={`listing-status status-${listing.status.toLowerCase()}`}
                >
                  {t(statusKeys[listing.status])}
                </span>
                {listing.moderationReason && (
                  <p className="moderation-reason">
                    {listing.moderationReason}
                  </p>
                )}

                <div className="my-listing-actions">
                  {listing.status !== "APPROVED" && (
                    <button type="button" onClick={() => approve(listing)}>
                      {t("approve")}
                    </button>
                  )}
                  {listing.status !== "REJECTED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(listing.id);
                        setReason("");
                      }}
                    >
                      {t("reject")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="delete-listing-button"
                    onClick={() => remove(listing)}
                  >
                    {t("delete")}
                  </button>
                </div>

                {rejectingId === listing.id && (
                  <form
                    className="admin-reject-form"
                    onSubmit={(event) => reject(event, listing)}
                  >
                    <label>
                      <span>{t("rejectReason")}</span>
                      <input
                        required
                        maxLength={255}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </label>

                    <div className="my-listing-actions">
                      <button type="submit">{t("confirmReject")}</button>
                      <button type="button" onClick={() => setRejectingId(null)}>
                        {t("cancel")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  function renderListingsSection() {
    return (
      <>
      <fieldset className="filters" aria-label={t("filterStatus")}>
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.status}
            aria-pressed={status === tab.status}
            className={status === tab.status ? "filter selected" : "filter"}
            onClick={() => changeStatus(tab.status)}
          >
            {t(tab.key)}
          </button>
        ))}
      </fieldset>

      {message && <output>{message}</output>}
      {error && <p role="alert">{error}</p>}

      {renderListings()}
      </>
    );
  }

  return (
    <Modal
      onClose={onClose}
      titleId="admin-title"
      backdropClassName="modal-backdrop"
      dialogClassName="listing-modal my-listings-modal admin-modal"
    >
      <button className="modal-close" onClick={onClose} aria-label={t("close")}>
        ×
      </button>

      <span className="eyebrow">{t("backOffice")}</span>
      <h2 id="admin-title">{t("adminTitle")}</h2>

      <fieldset className="filters" aria-label={t("sectionLabel")}>
        <button
          type="button"
          aria-pressed={section === "listings"}
          className={section === "listings" ? "filter selected" : "filter"}
          onClick={() => setSection("listings")}
        >
          {t("sectionListings")}
        </button>
        <button
          type="button"
          aria-pressed={section === "categories"}
          className={section === "categories" ? "filter selected" : "filter"}
          onClick={() => setSection("categories")}
        >
          {t("sectionCategories")}
        </button>
        <button
          type="button"
          aria-pressed={section === "orders"}
          className={section === "orders" ? "filter selected" : "filter"}
          onClick={() => setSection("orders")}
        >
          {t("sectionOrders")}
        </button>
      </fieldset>

      {section === "categories" && (
        <AdminCategories
          categories={categories}
          onChange={onCategoriesChange}
        />
      )}
      {section === "orders" && <AdminOrders />}
      {section === "listings" && renderListingsSection()}
    </Modal>
  );
}
