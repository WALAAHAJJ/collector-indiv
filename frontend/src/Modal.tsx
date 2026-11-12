import { useEffect, type ReactNode } from "react";

type ModalProps = Readonly<{
  onClose: () => void;
  titleId: string;
  backdropClassName: string;
  dialogClassName: string;
  children: ReactNode;
}>;

export default function Modal({
  onClose,
  titleId,
  backdropClassName,
  dialogClassName,
  children,
}: ModalProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className={backdropClassName}>
      <button
        type="button"
        className="backdrop-dismiss"
        aria-label="Fermer en cliquant à l’extérieur"
        tabIndex={-1}
        onClick={onClose}
      />

      <dialog
        open
        className={dialogClassName}
        aria-labelledby={titleId}
        aria-modal="true"
      >
        {children}
      </dialog>
    </div>
  );
}
