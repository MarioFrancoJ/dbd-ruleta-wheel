import { useMemo, useState } from "react";

// Modal genérico para seleccionar items de un catálogo (perks, killers, survivors...).
//
// Props:
//   catalog: array de items normalizados:
//     { value, name, src, character?, english? }
//       - value: identificador estable (p.ej. nombre de archivo o ruta)
//       - name: etiqueta visible
//       - src: ruta completa lista para <img src>
//       - character/english: opcionales (solo perks)
//   selectedValues: array de `value` ya seleccionados al abrir
//   maxItems: máximo seleccionable (null = sin límite)
//   showCharacter / showEnglish: mostrar esos campos en cada item
//   title, confirmLabel, searchPlaceholder
//   onConfirm(selectedValues) / onClose()
export default function CatalogSelector({
  catalog = [],
  selectedValues = [],
  maxItems = null,
  showCharacter = false,
  showEnglish = false,
  title = "Seleccionar",
  confirmLabel = "Guardar cambios",
  searchPlaceholder = "Buscar...",
  onConfirm,
  onClose,
}) {
  const hasLimit =
    maxItems !== null && maxItems !== undefined && Number.isFinite(maxItems);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(() => new Set(selectedValues));

  const byValue = useMemo(() => {
    const m = new Map();
    for (const item of catalog) m.set(item.value, item);
    return m;
  }, [catalog]);

  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const results = useMemo(() => {
    const q = normalize(query).trim();
    if (!q) return catalog;
    return catalog.filter(
      (it) =>
        normalize(it.name).includes(q) ||
        (it.english && normalize(it.english).includes(q)) ||
        (it.character && normalize(it.character).includes(q))
    );
  }, [catalog, query]);

  const isFull = hasLimit && selection.size >= maxItems;

  function toggle(value) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (hasLimit && next.size >= maxItems) return prev;
        next.add(value);
      }
      return next;
    });
  }

  // Selecciona todos los resultados visibles (respeta el límite si lo hay).
  function selectAllVisible() {
    setSelection((prev) => {
      const next = new Set(prev);
      for (const it of results) {
        if (hasLimit && next.size >= maxItems) break;
        next.add(it.value);
      }
      return next;
    });
  }

  // Deselecciona todos los resultados visibles.
  function deselectAllVisible() {
    setSelection((prev) => {
      const next = new Set(prev);
      for (const it of results) next.delete(it.value);
      return next;
    });
  }

  const selectedItems = [...selection]
    .map((v) => byValue.get(v))
    .filter(Boolean);

  return (
    <div className="perk-selector__backdrop" onClick={onClose}>
      <div className="perk-selector" onClick={(e) => e.stopPropagation()}>
        <div className="perk-selector__header">
          <h3>{title}</h3>
          <span className="perk-selector__counter">
            {hasLimit ? `${selection.size}/${maxItems}` : selection.size}
          </span>
          <button
            className="perk-selector__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✖
          </button>
        </div>

        {/* Seleccionados */}
        <div className="perk-selector__selected">
          {selectedItems.length === 0 ? (
            <span className="perk-selector__empty">Nada seleccionado</span>
          ) : (
            selectedItems.map((item) => (
              <button
                key={item.value}
                type="button"
                className="perk-selector__chip"
                onClick={() => toggle(item.value)}
                title={`Quitar ${item.name}`}
              >
                <img src={item.src} alt={item.name} />
                <span>{item.name}</span>
                <span className="perk-selector__chip-x">✖</span>
              </button>
            ))
          )}
        </div>

        <input
          type="text"
          className="perk-selector__search"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="perk-selector__bulk">
          <button
            type="button"
            className="perk-selector__bulk-btn"
            onClick={selectAllVisible}
          >
            Seleccionar todo
          </button>
          <button
            type="button"
            className="perk-selector__bulk-btn"
            onClick={deselectAllVisible}
          >
            Deseleccionar todo
          </button>
          {query.trim() && (
            <span className="perk-selector__bulk-hint">
              (aplica a los resultados de la búsqueda)
            </span>
          )}
        </div>

        <div className="perk-selector__grid">
          {results.map((item) => {
            const isSelected = selection.has(item.value);
            const disabled = !isSelected && isFull;
            const character = item.character || "General";
            return (
              <button
                key={item.value}
                type="button"
                className={`perk-selector__item${
                  isSelected ? " perk-selector__item--selected" : ""
                }${disabled ? " perk-selector__item--disabled" : ""}`}
                onClick={() => toggle(item.value)}
                disabled={disabled}
                title={showCharacter ? `${item.name} (${character})` : item.name}
              >
                <img src={item.src} alt={item.name} />
                <span>{item.name}</span>
                {showEnglish && item.english && (
                  <span className="perk-selector__item-en">{item.english}</span>
                )}
                {showCharacter && (
                  <span className="perk-selector__item-char">({character})</span>
                )}
              </button>
            );
          })}
          {results.length === 0 && (
            <span className="perk-selector__empty">Sin resultados</span>
          )}
        </div>

        <div className="perk-selector__footer">
          <button className="perk-selector__cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="perk-selector__confirm"
            onClick={() => onConfirm([...selection])}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
