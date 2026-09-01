import { useMemo, useState } from "react";
import { searchPerks, perkImageSrc, MAX_PERKS_PER_VERSION } from "../utils/perks";

// Modal para seleccionar perks del listado global.
// selectedPerks: array de { name, image } (image = nombre de archivo)
// onConfirm(newPerks) / onClose()
export default function PerkSelector({ selectedPerks = [], onConfirm, onClose }) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(() =>
    selectedPerks.map((p) => ({ name: p.name, image: p.image }))
  );

  const results = useMemo(() => searchPerks(query), [query]);
  const selectedNames = useMemo(
    () => new Set(selection.map((p) => p.name)),
    [selection]
  );

  const isFull = selection.length >= MAX_PERKS_PER_VERSION;

  function togglePerk(perk) {
    setSelection((prev) => {
      const exists = prev.some((p) => p.name === perk.name);
      if (exists) {
        return prev.filter((p) => p.name !== perk.name);
      }
      if (prev.length >= MAX_PERKS_PER_VERSION) return prev;
      return [...prev, { name: perk.name, image: perk.image }];
    });
  }

  return (
    <div className="perk-selector__backdrop" onClick={onClose}>
      <div className="perk-selector" onClick={(e) => e.stopPropagation()}>
        <div className="perk-selector__header">
          <h3>Seleccionar perks</h3>
          <span className="perk-selector__counter">
            {selection.length}/{MAX_PERKS_PER_VERSION}
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
                key={perk.name}
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
          placeholder="Buscar perk..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="perk-selector__grid">
          {results.map((perk) => {
            const isSelected = selectedNames.has(perk.name);
            const disabled = !isSelected && isFull;
            return (
              <button
                key={perk.name}
                type="button"
                className={`perk-selector__item${
                  isSelected ? " perk-selector__item--selected" : ""
                }${disabled ? " perk-selector__item--disabled" : ""}`}
                onClick={() => togglePerk(perk)}
                disabled={disabled}
                title={perk.name}
              >
                <img src={perkImageSrc(perk.image)} alt={perk.name} />
                <span>{perk.name}</span>
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
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
