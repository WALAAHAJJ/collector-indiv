import { useState, type SyntheticEvent } from "react";
import { formatExpiry } from "./cardFormat";
import Modal from "./Modal";
import { formatEuros } from "./money";
import {
  CARD_NUMBER_PATTERN,
  CVC_PATTERN,
  EXPIRY_PATTERN,
  purchase,
  type Order,
} from "./ordersApi";

export type PurchasableListing = {
  id: string;
  title: string;
  price: number;
  shippingCost: number;
};

type PurchaseDialogProps = Readonly<{
  listing: PurchasableListing;
  onClose: () => void;
  onPurchased: (order: Order) => void;
}>;

export default function PurchaseDialog({
  listing,
  onClose,
  onPurchased,
}: PurchaseDialogProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const total = listing.price + listing.shippingCost;

  function validate(): string {
    if (!CARD_NUMBER_PATTERN.test(cardNumber.trim())) {
      return "Numéro de carte invalide : 13 à 19 chiffres.";
    }

    if (!cardHolder.trim()) {
      return "Indiquez le nom inscrit sur la carte.";
    }

    if (!EXPIRY_PATTERN.test(expiry)) {
      return "Date d’expiration invalide : format MM/AA.";
    }

    if (!CVC_PATTERN.test(cvc)) {
      return "Code de sécurité invalide : 3 ou 4 chiffres.";
    }

    return "";
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const order = await purchase({
        listingId: listing.id,
        cardNumber: cardNumber.trim(),
        cardHolder: cardHolder.trim(),
        expiry,
        cvc,
      });

      // Les coordonnées de carte ne servent qu'une fois : on les efface de l'état dès la réponse.
      setCardNumber("");
      setCvc("");
      setReceipt(order);
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

  if (receipt) {
    return (
      <Modal
        onClose={() => onPurchased(receipt)}
        titleId="purchase-title"
        backdropClassName="auth-backdrop"
        dialogClassName="auth-card purchase-card"
      >
        <span className="eyebrow">MERCI</span>
        <h2 id="purchase-title">Paiement accepté</h2>
        <p>
          Votre commande « {receipt.listingName} » est enregistrée. Retrouvez-la
          dans « Mes commandes ».
        </p>

        <dl className="purchase-summary">
          <div>
            <dt>Montant payé</dt>
            <dd>{formatEuros(receipt.buyerTotal)}</dd>
          </div>
          <div>
            <dt>Carte</dt>
            <dd>•••• {receipt.cardLast4}</dd>
          </div>
        </dl>

        <button
          className="auth-submit"
          type="button"
          onClick={() => onPurchased(receipt)}
        >
          Fermer
        </button>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      titleId="purchase-title"
      backdropClassName="auth-backdrop"
      dialogClassName="auth-card purchase-card"
    >
      <button
        className="auth-close"
        type="button"
        onClick={onClose}
        aria-label="Fermer"
      >
        ×
      </button>

      <span className="eyebrow">PAIEMENT SIMULÉ</span>
      <h2 id="purchase-title">Acheter</h2>
      <p>{listing.title}</p>

      <dl className="purchase-summary">
        <div>
          <dt>Objet</dt>
          <dd>{formatEuros(listing.price)}</dd>
        </div>
        <div>
          <dt>Expédition</dt>
          <dd>{formatEuros(listing.shippingCost)}</dd>
        </div>
        <div className="purchase-total">
          <dt>Total à payer</dt>
          <dd>{formatEuros(total)}</dd>
        </div>
      </dl>
      <p className="purchase-note">
        Le site prélève 5 % de commission sur le vendeur, pas sur vous. Aucun
        argent réel n’est débité : utilisez la carte de test 4242 4242 4242
        4242.
      </p>

      <form className="listing-form" onSubmit={handleSubmit} noValidate>
        <label>
          Numéro de carte
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            maxLength={23}
            value={cardNumber}
            onChange={(event) => setCardNumber(event.target.value)}
          />
        </label>

        <label>
          Nom sur la carte
          <input
            autoComplete="cc-name"
            maxLength={60}
            value={cardHolder}
            onChange={(event) => setCardHolder(event.target.value)}
          />
        </label>

        <div className="purchase-row">
          <label>
            Expiration
            <input
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/AA"
              maxLength={5}
              value={expiry}
              onChange={(event) => setExpiry(formatExpiry(event.target.value))}
            />
          </label>

          <label>
            Code de sécurité
            <input
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
              value={cvc}
              onChange={(event) => setCvc(event.target.value)}
            />
          </label>
        </div>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Paiement…" : `Payer ${formatEuros(total)}`}
        </button>
      </form>
    </Modal>
  );
}
