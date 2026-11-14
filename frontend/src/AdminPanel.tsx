import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminCollectibleUrl, adminListUrl, type AdminStatus } from "./api";
import { getToken } from "./auth";
import AdminCategories from "./AdminCategories";
import { visualForLabel, type Category } from "./categories";
import { statusLabels, type ListingStatus } from "./listingStatus";
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
};

type AdminPanelProps = Readonly<{
  categories: Category[];
  onCategoriesChange: () => Promise<void> | void;
  onClose: () => void;
}>;

const tabs: { status: AdminStatus; label: string }[] = [
  { status: "PENDING_REVIEW", label: "En attente" },
  { status: "APPROVED", label: "Approuvées" },
  { status: "REJECTED", label: "Refusées" },
];

const emptyMessages: Record<AdminStatus, string> = {
  PENDING_REVIEW: "Aucune annonce en attente de vérification.",
  APPROVED: "Aucune annonce approuvée.",
  REJECTED: "Aucune annonce refusée.",
};

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
  const [section, setSection] = useState<"listings" | "categories">(
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
      throw new Error("Session expirée : reconnectez-vous.");
    }

    if (response.status === 403) {
      throw new Error("Accès réservé aux administrateurs.");
    }

    if (!response.ok) {
      throw new Error("Impossible de charger les annonces.");
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
              : "Une erreur est survenue.",
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
        throw new Error("Session expirée : reconnectez-vous.");
      }

      if (!response.ok) {
        throw new Error("L’action a échoué. Réessayez.");
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
      "Annonce approuvée.",
    );
  }

  function reject(event: FormEvent<HTMLFormElement>, listing: AdminListing) {
    event.preventDefault();

    if (reason.trim() === "") {
      setError("Indiquez un motif de refus.");
      return Promise.resolve();
    }

    return applyAction(
      () =>
        fetch(adminCollectibleUrl(listing.id, "reject"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ reason: reason.trim() }),
        }),
      "Annonce refusée.",
    );
  }

  function remove(listing: AdminListing) {
    if (!window.confirm(`Supprimer l’annonce « ${listing.name} » ?`)) {
      return Promise.resolve();
    }

    return applyAction(
      () =>
        fetch(adminCollectibleUrl(listing.id), {
          method: "DELETE",
          headers: authHeaders(),
        }),
      "Annonce supprimée.",
    );
  }

  function renderListings() {
    if (loading) {
      return <p className="empty-state">Chargement des annonces…</p>;
    }

    if (listings.length === 0) {
      return error ? null : (
        <p className="empty-state">{emptyMessages[status]}</p>
      );
    }

    return (
      <div className="my-listings-list">
        {listings.map((listing) => {
          const visual = visualForLabel(listing.category, categories);

          return (
            <article className="my-listing-card" key={listing.id}>
              <div
                className={`my-listing-placeholder ${visual.tone}`}
                aria-hidden="true"
              >
                <ObjectArt kind={visual.art} size={96} />
              </div>

              <div className="my-listing-info">
                <span className="item-category">{listing.category}</span>
                <h3>{listing.name}</h3>
                <p className="admin-owner">
                  Vendeur : {listing.ownerId.slice(0, 8)}…
                </p>
                {listing.description && <p>{listing.description}</p>}
                <p>Prix : {formatEuros(listing.price)}</p>
                <p>Expédition : {formatEuros(listing.shippingCost)}</p>
                <span
                  className={`listing-status status-${listing.status.toLowerCase()}`}
                >
                  {statusLabels[listing.status]}
                </span>
                {listing.moderationReason && (
                  <p className="moderation-reason">
                    {listing.moderationReason}
                  </p>
                )}

                <div className="my-listing-actions">
                  {listing.status !== "APPROVED" && (
                    <button type="button" onClick={() => approve(listing)}>
                      Approuver
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
                      Refuser
                    </button>
                  )}
                  <button
                    type="button"
                    className="delete-listing-button"
                    onClick={() => remove(listing)}
                  >
                    Supprimer
                  </button>
                </div>

                {rejectingId === listing.id && (
                  <form
                    className="admin-reject-form"
                    onSubmit={(event) => reject(event, listing)}
                  >
                    <label>
                      Motif du refus
                      <input
                        required
                        maxLength={255}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </label>

                    <div className="my-listing-actions">
                      <button type="submit">Confirmer le refus</button>
                      <button type="button" onClick={() => setRejectingId(null)}>
                        Annuler
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
      <div className="filters" role="group" aria-label="Filtrer par statut">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.status}
            aria-pressed={status === tab.status}
            className={status === tab.status ? "filter selected" : "filter"}
            onClick={() => changeStatus(tab.status)}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
      <button className="modal-close" onClick={onClose} aria-label="Fermer">
        ×
      </button>

      <span className="eyebrow">back-office</span>
      <h2 id="admin-title">Administration</h2>

      <div className="filters" role="group" aria-label="Section">
        <button
          type="button"
          aria-pressed={section === "listings"}
          className={section === "listings" ? "filter selected" : "filter"}
          onClick={() => setSection("listings")}
        >
          Annonces
        </button>
        <button
          type="button"
          aria-pressed={section === "categories"}
          className={section === "categories" ? "filter selected" : "filter"}
          onClick={() => setSection("categories")}
        >
          Catégories
        </button>
      </div>

      {section === "categories" ? (
        <AdminCategories
          categories={categories}
          onChange={onCategoriesChange}
        />
      ) : (
        renderListingsSection()
      )}
    </Modal>
  );
}
