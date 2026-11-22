import Modal from "./Modal";
import { useLanguage } from "./i18n";

type IdleWarningProps = Readonly<{
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}>;

/** Avertissement avant la déconnexion pour inactivité. */
export default function IdleWarning({ secondsLeft, onStay, onLogout }: IdleWarningProps) {
  const { t } = useLanguage();

  return (
    <Modal
      onClose={onStay}
      titleId="idle-title"
      backdropClassName="modal-backdrop"
      dialogClassName="listing-modal idle-warning"
    >
      <h2 id="idle-title">{t("idleTitle")}</h2>
      <p role="status">
        {t("idleText")} {secondsLeft} s.
      </p>
      <div className="idle-actions">
        <button type="button" className="sell-button" onClick={onStay}>
          {t("idleStay")}
        </button>
        <button type="button" className="login-button" onClick={onLogout}>
          {t("logout")}
        </button>
      </div>
    </Modal>
  );
}
