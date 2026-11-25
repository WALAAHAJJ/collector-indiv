import { useLanguage } from "./i18n";

type Props = {
  page: number;
  pages: number;
  onChange: (page: number) => void;
};

/** Navigation entre les pages du catalogue ; rien n'est affiché quand il n'y a qu'une page. */
export function Pagination({ page, pages, onChange }: Props) {
  const { t } = useLanguage();

  if (pages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label={t("paginationLabel")}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        {t("previous")}
      </button>

      <span aria-live="polite">
        {t("pageOf", { page, pages })}
      </span>

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
      >
        {t("next")}
      </button>
    </nav>
  );
}
