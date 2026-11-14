import { useState, type FormEvent } from "react";
import { getToken } from "./auth";
import type { Category } from "./categories";
import Modal from "./Modal";

type ListingFormProps = {
  ownerId: string;
  categories: Category[];
  onClose: () => void;
  onSubmitted: () => void;
};

type CreatedListing = {
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  moderationReason: string | null;
};

export default function ListingForm({
  ownerId,
  categories,
  onClose,
  onSubmitted,
}: Readonly<ListingFormProps>) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "");
  const [condition, setCondition] = useState("good");
  const [price, setPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("0.00");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = getToken();

      const response = await fetch("/api/collectibles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ownerId,
          name: title,
          category,
          description,
          price: Number(price),
          shippingCost: Number(shippingCost),
          condition: condition.toUpperCase(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          "L’annonce n’a pas pu être envoyée. Vérifie les champs.",
        );
      }

      const created = (await response.json()) as CreatedListing;

      if (created.status === "REJECTED") {
        throw new Error(
          created.moderationReason ??
            "Votre annonce a été refusée par la modération automatique.",
        );
      }

      onSubmitted();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Impossible de contacter le serveur.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      titleId="listing-form-title"
      backdropClassName="auth-backdrop"
      dialogClassName="auth-card listing-form-card"
    >
      <button
        className="auth-close"
        type="button"
        onClick={onClose}
        aria-label="Fermer"
      >
        ×
      </button>

      <span className="eyebrow">PARTAGEZ VOTRE COLLECTION</span>
      <h2 id="listing-form-title">Déposer une annonce</h2>
      <p>Votre annonce est contrôlée automatiquement avant sa publication.</p>

      <form className="listing-form" onSubmit={handleSubmit}>
        <label>
          Titre de l’annonce
          <input
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label>
          Description
          <textarea
            required
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label>
          Catégorie
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
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
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
          >
            <option value="new">Neuf</option>
            <option value="very_good">Très bon état</option>
            <option value="good">Bon état</option>
            <option value="used">État d’usage</option>
          </select>
        </label>

        <label>
          Prix de l’objet en euros
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>

        <label>
          Frais d’expédition en euros
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={shippingCost}
            onChange={(event) => setShippingCost(event.target.value)}
          />
        </label>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Envoi…" : "Publier l’annonce"}
        </button>
      </form>
    </Modal>
  );
}
