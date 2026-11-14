import { useCallback, useEffect, useState } from "react";
import { getToken } from "./auth";
import { collectibleUrl, myCollectiblesUrl } from "./api";
import { visualForLabel, type Category } from "./categories";
import { statusLabels, type ListingStatus } from "./listingStatus";
import ObjectArt from "./ObjectArt";
import Modal from "./Modal";

type Listing = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  condition: string;
  price: number;
  shippingCost: number;
  status: ListingStatus;
  moderationReason: string | null;
};

type EditForm = {
  name: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  shippingCost: string;
};

type MyListingsProps = {
  ownerId: string;
  categories: Category[];
  onClose: () => void;
};

const initialForm: EditForm = {
  name: "",
  description: "",
  category: "Autres objets",
  condition: "good",
  price: "",
  shippingCost: "0",
};

function formatEuros(value: number): string {
  return `${Number(value).toFixed(2).replace(".", ",")} €`;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MyListings({
  ownerId,
  categories,
  onClose,
}: Readonly<MyListingsProps>) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(initialForm);

  const fetchMyListings = useCallback(async (): Promise<Listing[]> => {
    const response = await fetch(myCollectiblesUrl(ownerId), {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error("Impossible de charger vos annonces.");
    }

    return (await response.json()) as Listing[];
  }, [ownerId]);

  useEffect(() => {
    fetchMyListings()
      .then(setListings)
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Une erreur est survenue.",
        );
      })
      .finally(() => setLoading(false));
  }, [fetchMyListings]);

  function startEditing(listing: Listing) {
    setEditingId(listing.id);
    setEditForm({
      name: listing.name,
      description: listing.description ?? "",
      category: listing.category,
      condition: listing.condition.toLowerCase(),
      price: String(listing.price),
      shippingCost: String(listing.shippingCost),
    });
    setError("");
    setMessage("");
  }

  async function saveListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingId === null) return;

    try {
      const response = await fetch(collectibleUrl(editingId), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category,
          description: editForm.description,
          price: Number(editForm.price),
          shippingCost: Number(editForm.shippingCost),
          condition: editForm.condition.toUpperCase(),
        }),
      });

      if (!response.ok) {
        throw new Error("La modification a échoué. Vérifie les champs.");
      }

      setListings(await fetchMyListings());
      setEditingId(null);
      setMessage("Annonce modifiée et contrôlée à nouveau.");
      setError("");
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "La modification a échoué.",
      );
    }
  }

  async function deleteListing(listing: Listing) {
    if (!window.confirm(`Supprimer l’annonce « ${listing.name} » ?`)) return;

    try {
      const response = await fetch(collectibleUrl(listing.id), {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error("La suppression a échoué.");
      }

      setListings((current) =>
        current.filter((item) => item.id !== listing.id),
      );
      setMessage("Annonce supprimée.");
      setError("");
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "La suppression a échoué.",
      );
    }
  }

  return (
    <Modal
      onClose={onClose}
      titleId="my-listings-title"
      backdropClassName="modal-backdrop"
      dialogClassName="listing-modal my-listings-modal"
    >
      <button className="modal-close" onClick={onClose} aria-label="Fermer">
        ×
      </button>

      <span className="eyebrow">MON ESPACE</span>
      <h2 id="my-listings-title">Mes annonces</h2>

      {message && <output>{message}</output>}
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p className="empty-state">Chargement de vos annonces…</p>
      ) : listings.length === 0 ? (
        <p className="empty-state">Vous n’avez pas encore déposé d’annonce.</p>
      ) : (
        <div className="my-listings-list">
          {listings.map((listing) => (
            <article className="my-listing-card" key={listing.id}>
              <div
                  className={`my-listing-placeholder ${visualForLabel(listing.category, categories).tone}`}
                  aria-hidden="true"
                >
                  <ObjectArt
                    kind={visualForLabel(listing.category, categories).art}
                    size={96}
                  />
                </div>

              <div className="my-listing-info">
                <span className="item-category">{listing.category}</span>
                <h3>{listing.name}</h3>
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
                  <button onClick={() => startEditing(listing)}>
                    Modifier
                  </button>
                  <button
                    className="delete-listing-button"
                    onClick={() => deleteListing(listing)}
                  >
                    Supprimer
                  </button>
                </div>

                {editingId === listing.id && (
                  <form className="my-listing-edit-form" onSubmit={saveListing}>
                    <label>
                      Titre
                      <input
                        required
                        maxLength={120}
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm({ ...editForm, name: event.target.value })
                        }
                      />
                    </label>

                    <label>
                      Description
                      <textarea
                        required
                        maxLength={1000}
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            description: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Catégorie
                      <select
                        value={editForm.category}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            category: event.target.value,
                          })
                        }
                      >
                        {categories.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      État
                      <select
                        value={editForm.condition}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            condition: event.target.value,
                          })
                        }
                      >
                        <option value="new">Neuf</option>
                        <option value="very_good">Très bon état</option>
                        <option value="good">Bon état</option>
                        <option value="used">État d’usage</option>
                      </select>
                    </label>

                    <label>
                      Prix (€)
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editForm.price}
                        onChange={(event) =>
                          setEditForm({ ...editForm, price: event.target.value })
                        }
                      />
                    </label>

                    <label>
                      Frais d’expédition (€)
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.shippingCost}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            shippingCost: event.target.value,
                          })
                        }
                      />
                    </label>

                    <div className="my-listing-actions">
                      <button type="submit">Enregistrer</button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}
