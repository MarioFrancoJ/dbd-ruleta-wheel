import { useMemo, useState } from "react";
import { searchPerks, perkImageSrc, MAX_PERKS_PER_VERSION } from "../utils/perks";

// Modal para seleccionar perks del listado global.
// selectedPerks: array de { name, image } (image = nombre de archivo)
// maxPerks: número máximo de perks seleccionables. Usar null para sin límite
//   (por ejemplo al agregar perks a la ruleta de perks).
// title: título del modal.
// confirmLabel: texto del botón de confirmar.
// onConfirm(newPerks) / onClose()
export default function PerkSelector({
  selectedPerks = [],
  maxPerks = MAX_PERKS_PER_VERSION,
  title = "Seleccionar perks",
  confirmLabel = "Confirmar",
  onConfirm,
  onClose,
}) {
  const hasLimit = maxPerks !== null && maxPerks !== undefined && Number.isFinite(maxPerks);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(() =>
    selectedPerks.map((p) => ({ name: p.name, image: p.image }))
  );

  const results = useMemo(() => searchPerks(query), [query]);
  // Identificamos las perks por su imagen (identificador estable) en vez de por
  // el nombre, para que la selección funcione aunque los nombres difieran.
  const selectedImages = useMemo(
    () => new Set(selection.map((p) => p.image)),
    [selection]
  );

  const isFull = hasLimit && selection.length >= maxPerks;

  function togglePerk(perk) {
    setSelection((prev) => {
      const exists = prev.some((p) => p.image === perk.image);
      if (exists) {
        return prev.filter((p) => p.image !== perk.image);
      }
      if (hasLimit && prev.length >= maxPerks) return prev;
      return [...prev, { name: perk.name, image: perk.image }];
    });
  }

  return (
    <div className="perk-selector__backdrop" onClick={onClose}>
      <div className="perk-selector" onClick={(e) => e.stopPropagation()}>
        <div className="perk-selector__header">
          <h3>{title}</h3>
          <span className="perk-selector__counter">
            {hasLimit ? `${selection.length}/${maxPerks}` : selection.length}
          </span>
          <button className="perk-selector__close" onClick={onClose} aria-label="Cerrar">
            ✖
          </button>
        </div>

        {/* Perks seleccionadas */}
        <div className="perk-selector__selected">
          {selection.length === 0 ? (
            <span className="perk-selector__empty">Ninguna perk seleccionada</span>
          ) : (
            selection.map((perk) => (
              <button
                key={perk.image}
                type="button"
                className="perk-selector__chip"
                onClick={() => togglePerk(perk)}
                title={`Quitar ${perk.name}`}
              >
                <img src={perkImageSrc(perk.image)} alt={perk.name} />
                <span>{perk.name}</span>
                <span className="perk-selector__chip-x">✖</span>
              </button>
            ))
          )}
        </div>

        <input
          type="text"
          className="perk-selector__search"
          placeholder="Buscar por perk o personaje..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="perk-selector__grid">
          {results.map((perk) => {
            const isSelected = selectedImages.has(perk.image);
            const disabled = !isSelected && isFull;
            const character = perk.character || "General";
            return (
              <button
                key={perk.image}
                type="button"
                className={`perk-selector__item${
                  isSelected ? " perk-selector__item--selected" : ""
                }${disabled ? " perk-selector__item--disabled" : ""}`}
                onClick={() => togglePerk(perk)}
                disabled={disabled}
                title={`${perk.name} (${character})`}
              >
                <img src={perkImageSrc(perk.image)} alt={perk.name} />
                <span>{perk.name}</span>
                <span className="perk-selector__item-char">({character})</span>
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
            onClick={() => onConfirm(selection)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
