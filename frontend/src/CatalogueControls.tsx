import {
  CONDITION_OPTIONS,
  NO_FILTERS,
  SORT_OPTIONS,
  type CatalogFilters,
  hasActiveFilters,
  isSortKey,
} from "./catalogue";

type Props = {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  /** Nombre d'annonces correspondant aux filtres. */
  count: number;
  /** Filtre « Mes favoris » : affiché seulement si le parent le gère. */
  favorites?: { count: number; active: boolean; onToggle: () => void };
};

/** Barre de tri et de filtres du catalogue : fourchette de prix, état, ordre d'affichage. */
export function CatalogueControls({ filters, onChange, count, favorites }: Props) {
  function update(patch: Partial<CatalogFilters>) {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="catalogue-controls">
      <label>
        <span>Prix min (€)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={filters.minPrice}
          onChange={(event) => update({ minPrice: event.target.value })}
        />
      </label>

      <label>
        <span>Prix max (€)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={filters.maxPrice}
          onChange={(event) => update({ maxPrice: event.target.value })}
        />
      </label>

      <label>
        <span>État</span>
        <select
          value={filters.condition}
          onChange={(event) => update({ condition: event.target.value })}
        >
          <option value="">Tous les états</option>
          {CONDITION_OPTIONS.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Trier par</span>
        <select
          value={filters.sort}
          onChange={(event) => {
            if (isSortKey(event.target.value)) {
              update({ sort: event.target.value });
            }
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {favorites && (
        <button
          type="button"
          className={favorites.active ? "favorites-toggle active" : "favorites-toggle"}
          aria-pressed={favorites.active}
          onClick={favorites.onToggle}
        >
          {favorites.active ? "♥" : "♡"} Mes favoris ({favorites.count})
        </button>
      )}

      <p className="catalogue-count" aria-live="polite">
        {count} annonce{count > 1 ? "s" : ""}
      </p>

      {hasActiveFilters(filters) && (
        <button
          type="button"
          className="reset-filters"
          onClick={() => onChange(NO_FILTERS)}
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
