import { useEffect, useState } from "react";

type Listing = {
  id: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string | number;
  image: string | null;
  shipping_cost: string | number;
  status: "pending_review" | "approved" | "rejected";
};

type EditForm = {
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  shipping_cost: string;
  image: File | null;
};

type MyListingsProps = {
  onClose: () => void;
};

const categoryLabels: Record<string, string> = {
  postcards: "Cartes postales",
  coins: "Pièces",
  stamps: "Timbres",
  other: "Autres objets",
};

const statusLabels: Record<string, string> = {
  pending_review: "En attente de modération",
  approved: "Approuvée",
  rejected: "Refusée",
};

const initialForm: EditForm = {
  title: "",
  description: "",
  category: "other",
  condition: "good",
  price: "",
  shipping_cost: "0",
  image: null,
};

function formatEuros(value: string | number): string {
  return `${Number(value).toFixed(2).replace(".", ",")} €`;
}

function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf/", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Impossible de préparer la requête.");
  }

  const token = getCookie("csrftoken");
  if (!token) throw new Error("Jeton de sécurité introuvable.");

  return token;
}

async function fetchMyListings(): Promise<Listing[]> {
  const response = await fetch("/api/listings/mine/", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Impossible de charger vos annonces.");
  }

  return (await response.json()) as Listing[];
}

export default function MyListings({ onClose }: MyListingsProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(initialForm);

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
  }, []);

  function startEditing(listing: Listing) {
    setEditingId(listing.id);
    setEditForm({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      condition: listing.condition,
      price: String(listing.price),
      shipping_cost: String(listing.shipping_cost),
      image: null,
    });
    setError("");
    setMessage("");
  }

  async function saveListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingId === null) return;

    try {
      const csrfToken = await getCsrfToken();
      const body = new FormData();

      body.append("title", editForm.title);
      body.append("description", editForm.description);
      body.append("category", editForm.category);
      body.append("condition", editForm.condition);
      body.append("price", editForm.price);
      body.append("shipping_cost", editForm.shipping_cost);
      if (editForm.image) body.append("image", editForm.image);

      const response = await fetch(
        `/api/listings/${editingId}/manage/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "X-CSRFToken": csrfToken },
          body,
        },
      );

      if (!response.ok) {
        throw new Error("La modification a échoué. Vérifie les champs.");
      }

      setListings(await fetchMyListings());
      setEditingId(null);
      setMessage("Annonce modifiée. Elle doit être approuvée à nouveau.");
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "La modification a échoué.",
      );
    }
  }

  async function deleteListing(listing: Listing) {
    if (!window.confirm(`Supprimer l’annonce « ${listing.title} » ?`)) return;

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(
        `/api/listings/${listing.id}/manage/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRFToken": csrfToken },
        },
      );

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
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="listing-modal my-listings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-listings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>

        <span className="eyebrow">MON ESPACE</span>
        <h2 id="my-listings-title">Mes annonces</h2>

        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}

        {loading ? (
          <p className="empty-state">Chargement de vos annonces…</p>
        ) : listings.length === 0 ? (
          <p className="empty-state">Vous n’avez pas encore déposé d’annonce.</p>
        ) : (
          <div className="my-listings-list">
            {listings.map((listing) => (
              <article className="my-listing-card" key={listing.id}>
                {listing.image ? (
                  <img
                    className="listing-photo"
                    src={listing.image}
                    alt={listing.title}
                  />
                ) : (
                  <div className="my-listing-placeholder" aria-hidden="true">
                    📦
                  </div>
                )}

                <div className="my-listing-info">
                  <span className="item-category">
                    {categoryLabels[listing.category] ?? listing.category}
                  </span>
                  <h3>{listing.title}</h3>
                  <p>Prix : {formatEuros(listing.price)}</p>
                  <p>Expédition : {formatEuros(listing.shipping_cost)}</p>
                  <span className={`listing-status status-${listing.status}`}>
                    {statusLabels[listing.status] ?? listing.status}
                  </span>

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
                          value={editForm.title}
                          onChange={(event) =>
                            setEditForm({ ...editForm, title: event.target.value })
                          }
                        />
                      </label>

                      <label>
                        Description
                        <textarea
                          required
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
                          <option value="postcards">Cartes postales</option>
                          <option value="coins">Pièces</option>
                          <option value="stamps">Timbres</option>
                          <option value="other">Autres objets</option>
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
                          value={editForm.shipping_cost}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              shipping_cost: event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        Remplacer la photo (facultatif)
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              image: event.target.files?.[0] ?? null,
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
      </section>
    </div>
  );
}