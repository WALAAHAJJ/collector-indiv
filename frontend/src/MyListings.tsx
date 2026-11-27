import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { getToken } from "./auth";
import { collectibleUrl, myCollectiblesUrl } from "./api";
import { visualForLabel, type Category } from "./categories";
import { tr, useLanguage } from "./i18n";
import { statusKeys, type ListingStatus } from "./listingStatus";
import ListingPhoto from "./ListingPhoto";
import ObjectArt from "./ObjectArt";
import { removePhoto, uploadPhoto } from "./photoApi";
import { PHOTO_TYPES, photoProblem, shrinkPhoto } from "./photoFile";
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
  hasPhoto?: boolean;
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
  const { t } = useLanguage();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(initialForm);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [photoVersion, setPhotoVersion] = useState(0);
  const photoRequest = useRef(0);

  const fetchMyListings = useCallback(async (): Promise<Listing[]> => {
    const response = await fetch(myCollectiblesUrl(ownerId), {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(tr("errLoadListings"));
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
            : tr("errGeneric"),
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
    setNewPhoto(null);
    setPhotoError("");
    setError("");
    setMessage("");
  }

  function stopEditing() {
    setEditingId(null);
    setNewPhoto(null);
    setPhotoError("");
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    const request = ++photoRequest.current;

    setNewPhoto(null);
    setPhotoError("");

    if (!chosen) return;

    const prepared = await shrinkPhoto(chosen);

    // Un choix plus récent a pris la place de celui-ci pendant la réduction.
    if (request !== photoRequest.current) return;

    const problem = photoProblem(prepared);

    if (problem) {
      setPhotoError(problem);
      return;
    }

    setNewPhoto(prepared);
  }

  async function deletePhotoOf(listing: Listing) {
    if (!window.confirm(t("confirmRemovePhoto"))) return;

    try {
      await removePhoto(listing.id);
      setListings(await fetchMyListings());
      setPhotoVersion((current) => current + 1);
      setMessage(t("photoRemoved"));
      setError("");
    } catch (requestError: unknown) {
      setMessage("");
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("errPhotoDelete"),
      );
    }
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
        throw new Error(t("errEditFailed"));
      }

      let photoFailure = "";

      if (newPhoto) {
        try {
          await uploadPhoto(editingId, newPhoto);
          setPhotoVersion((current) => current + 1);
        } catch (photoRequestError: unknown) {
          photoFailure =
            photoRequestError instanceof Error
              ? photoRequestError.message
              : t("errPhotoSend");
        }
      }

      setListings(await fetchMyListings());
      stopEditing();

      if (photoFailure) {
        setMessage("");
        setError(t("editedButPhoto", { reason: photoFailure }));
      } else {
        setMessage(t("listingEdited"));
        setError("");
      }
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("errEditShort"),
      );
    }
  }

  async function deleteListing(listing: Listing) {
    if (!window.confirm(t("confirmDelete", { name: listing.name }))) return;

    try {
      const response = await fetch(collectibleUrl(listing.id), {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error(t("errDelete"));
      }

      setListings((current) =>
        current.filter((item) => item.id !== listing.id),
      );
      setMessage(t("listingDeleted"));
      setError("");
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("errDelete"),
      );
    }
  }

  function renderArt(listing: Listing) {
    return (
      <ObjectArt
        kind={visualForLabel(listing.category, categories).art}
        size={96}
      />
    );
  }

  function renderListings() {
    if (loading) {
      return <p className="empty-state">{t("loadingMyListings")}</p>;
    }

    if (listings.length === 0) {
      return (
        <p className="empty-state">{t("noMyListings")}</p>
      );
    }

    return (
    <div className="my-listings-list">
      {listings.map((listing) => (
        <article className="my-listing-card" key={listing.id}>
          <div
            className={`my-listing-placeholder ${visualForLabel(listing.category, categories).tone}`}
          >
            {listing.hasPhoto ? (
              <ListingPhoto
                listingId={listing.id}
                alt={listing.name}
                className="listing-photo"
                version={photoVersion}
                fallback={renderArt(listing)}
              />
            ) : (
              renderArt(listing)
            )}
          </div>

          <div className="my-listing-info">
            <span className="item-category">{listing.category}</span>
            <h3>{listing.name}</h3>
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

            {listing.status === "SOLD" ? (
              <p className="moderation-reason">
                {t("soldLocked")}
              </p>
            ) : (
              <div className="my-listing-actions">
                <button onClick={() => startEditing(listing)}>
                  {t("edit")}
                </button>
                <button
                  className="delete-listing-button"
                  onClick={() => deleteListing(listing)}
                >
                  {t("delete")}
                </button>
              </div>
            )}

            {editingId === listing.id && (
              <form className="my-listing-edit-form" onSubmit={saveListing}>
                <label>
                  <span>{t("titleLabel")}</span>
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
                  <span>{t("descriptionTitle")}</span>
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
                  <span>{t("categoryLabel")}</span>
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
                  <span>{t("condition")}</span>
                  <select
                    value={editForm.condition}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        condition: event.target.value,
                      })
                    }
                  >
                    <option value="new">{t("conditionNew")}</option>
                    <option value="very_good">{t("conditionVeryGood")}</option>
                    <option value="good">{t("conditionGood")}</option>
                    <option value="used">{t("conditionUsed")}</option>
                  </select>
                </label>

                <label>
                  <span>{t("priceEuro")}</span>
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
                  <span>{t("shippingEuro")}</span>
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

                <label>
                  <span>{t("photoOptional")}</span>
                  <input
                    type="file"
                    accept={PHOTO_TYPES.join(",")}
                    onChange={handlePhotoChange}
                  />
                </label>

                {photoError && <p role="alert">{photoError}</p>}

                <div className="my-listing-actions">
                  <button type="submit">{t("save")}</button>
                  {listing.hasPhoto && (
                    <button
                      type="button"
                      className="delete-listing-button"
                      onClick={() => deletePhotoOf(listing)}
                    >
                      {t("removePhoto")}
                    </button>
                  )}
                  <button type="button" onClick={stopEditing}>
                    {t("cancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </article>
      ))}
    </div>
    );
  }

  return (
    <Modal
      onClose={onClose}
      titleId="my-listings-title"
      backdropClassName="modal-backdrop"
      dialogClassName="listing-modal my-listings-modal"
    >
      <button className="modal-close" onClick={onClose} aria-label={t("close")}>
        ×
      </button>

      <span className="eyebrow">{t("mySpace")}</span>
      <h2 id="my-listings-title">{t("myListings")}</h2>

      {message && <output>{message}</output>}
      {error && <p role="alert">{error}</p>}

      {renderListings()}
    </Modal>
  );
}
