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
};

/** Barre de tri et de filtres du catalogue : fourchette de prix, état, ordre d'affichage. */
export function CatalogueControls({ filters, onChange, count }: Props) {
  function update(patch: Partial<CatalogFilters>) {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="catalogue-controls">
      <label>
        Prix min (€)
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={filters.minPrice}
          onChange={(event) => update({ minPrice: event.target.value })}
        />
      </label>

      <label>
        Prix max (€)
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={filters.maxPrice}
          onChange={(event) => update({ maxPrice: event.target.value })}
        />
      </label>

      <label>
        État
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
        Trier par
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
