import { useState, type FormEvent } from "react";

type ListingFormProps = {
  onClose: () => void;
  onSubmitted: () => void;
};

function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export default function ListingForm({
  onClose,
  onSubmitted,
}: ListingFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("postcards");
  const [condition, setCondition] = useState("good");
  const [price, setPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("0.00");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const csrfResponse = await fetch("/api/auth/csrf/", {
        credentials: "include",
      });

      if (!csrfResponse.ok) {
        throw new Error("Impossible de préparer l’envoi du formulaire.");
      }

      const csrfToken = getCookie("csrftoken");

      if (!csrfToken) {
        throw new Error("Jeton de sécurité introuvable. Réessaie.");
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("condition", condition);
      formData.append("price", price);
      formData.append("shipping_cost", shippingCost);

      if (image) {
        formData.append("image", image);
      }

      const response = await fetch("/api/listings/submit/", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.detail ??
            "L’annonce n’a pas pu être envoyée. Vérifie les champs et ta connexion.",
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
    <div className="auth-backdrop" onClick={onClose}>
      <section
        className="auth-card listing-form-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-form-title"
        onClick={(event) => event.stopPropagation()}
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
        <p>Votre annonce sera vérifiée avant sa publication.</p>

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
              <option value="postcards">Cartes postales</option>
              <option value="coins">Pièces</option>
              <option value="stamps">Timbres</option>
              <option value="other">Autres objets</option>
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

          <label>
            Photo de l’objet (facultative)
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setImage(event.target.files?.[0] ?? null)
              }
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Envoi…" : "Envoyer pour modération"}
          </button>
        </form>
      </section>
    </div>
  );
}