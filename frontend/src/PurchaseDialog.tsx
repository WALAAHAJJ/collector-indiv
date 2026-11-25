import { useState, type SyntheticEvent } from "react";
import { formatExpiry } from "./cardFormat";
import { useLanguage } from "./i18n";
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
  const { t } = useLanguage();
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
      return t("errCardNumber");
    }

    if (!cardHolder.trim()) {
      return t("errCardHolder");
    }

    if (!EXPIRY_PATTERN.test(expiry)) {
      return t("errExpiry");
    }

    if (!CVC_PATTERN.test(cvc)) {
      return t("errSecurityCode");
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
          : t("errServer"),
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
        <span className="eyebrow">{t("purchaseThanks")}</span>
        <h2 id="purchase-title">{t("paymentAccepted")}</h2>
        <p>
          {t("orderRecorded", { name: receipt.listingName })}
        </p>

        <dl className="purchase-summary">
          <div>
            <dt>{t("amountPaid")}</dt>
            <dd>{formatEuros(receipt.buyerTotal)}</dd>
          </div>
          <div>
            <dt>{t("card")}</dt>
            <dd>•••• {receipt.cardLast4}</dd>
          </div>
        </dl>

        <button
          className="auth-submit"
          type="button"
          onClick={() => onPurchased(receipt)}
        >
          {t("close")}
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
        aria-label={t("close")}
      >
        ×
      </button>

      <span className="eyebrow">{t("simulatedPayment")}</span>
      <h2 id="purchase-title">{t("buy")}</h2>
      <p>{listing.title}</p>

      <dl className="purchase-summary">
        <div>
          <dt>{t("item")}</dt>
          <dd>{formatEuros(listing.price)}</dd>
        </div>
        <div>
          <dt>{t("shippingShort")}</dt>
          <dd>{formatEuros(listing.shippingCost)}</dd>
        </div>
        <div className="purchase-total">
          <dt>{t("totalToPay")}</dt>
          <dd>{formatEuros(total)}</dd>
        </div>
      </dl>
      <p className="purchase-note">
        {t("commissionNote")}
      </p>

      <form className="listing-form" onSubmit={handleSubmit} noValidate>
        <label>
          <span>{t("cardNumber")}</span>
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
          <span>{t("cardHolder")}</span>
          <input
            autoComplete="cc-name"
            maxLength={60}
            value={cardHolder}
            onChange={(event) => setCardHolder(event.target.value)}
          />
        </label>

        <div className="purchase-row">
          <label>
            <span>{t("expiry")}</span>
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
            <span>{t("securityCode")}</span>
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
          {loading ? t("paying") : t("pay", { amount: formatEuros(total) })}
        </button>
      </form>
    </Modal>
  );
}
