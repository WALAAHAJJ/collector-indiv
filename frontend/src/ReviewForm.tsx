import { useState, type FormEvent } from "react";
import { MAX_COMMENT_LENGTH, postReview, type Review } from "./reviewsApi";

type ReviewFormProps = Readonly<{
  orderId: string;
  onSaved: (review: Review) => void;
}>;

/** Formulaire d'avis sur une commande reçue : une note de 1 à 5 et un commentaire facultatif. */
export default function ReviewForm({ orderId, onSaved }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (rating === 0) {
      setError("Choisissez une note de 1 à 5.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      onSaved(await postReview(orderId, rating, comment));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Avis momentanément indisponible.");
      setBusy(false);
    }
  }

  return (
    <form className="review-form" onSubmit={(event) => void submit(event)}>
      <fieldset>
        <legend>Notez le vendeur</legend>
        <div className="star-picker">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              key={value}
              className={value <= rating ? "star-button on" : "star-button"}
              aria-pressed={value === rating}
              aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
              onClick={() => setRating(value)}
            >
              {value <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
      </fieldset>

      <label>
        Commentaire (facultatif)
        <textarea
          value={comment}
          maxLength={MAX_COMMENT_LENGTH}
          rows={3}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>

      {error && <p role="alert">{error}</p>}

      <button className="auth-submit order-action" type="submit" disabled={busy}>
        Publier mon avis
      </button>
    </form>
  );
}
