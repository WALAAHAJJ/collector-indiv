type Props = {
  page: number;
  pages: number;
  onChange: (page: number) => void;
};

/** Navigation entre les pages du catalogue ; rien n'est affiché quand il n'y a qu'une page. */
export function Pagination({ page, pages, onChange }: Props) {
  if (pages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Pagination du catalogue">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        ← Précédent
      </button>

      <span aria-live="polite">
        Page {page} sur {pages}
      </span>

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
      >
        Suivant →
      </button>
    </nav>
  );
}
