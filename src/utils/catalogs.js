import defaultWheels from "../data/defaultWheels.json";
import { GLOBAL_PERKS, perkImageSrc } from "./perks";

// Catálogos normalizados para el CatalogSelector.
// Cada item: { value (id estable), name, src (ruta <img>), character?, english? }

function defaultOptions(wheelId) {
  const wheel = defaultWheels.find((w) => w.id === wheelId);
  return wheel && Array.isArray(wheel.options) ? wheel.options : [];
}

// Killers y survivors: el catálogo son las opciones por defecto {label, image}.
// El identificador estable es la ruta de la imagen.
function buildCharacterCatalog(wheelId) {
  return defaultOptions(wheelId)
    .filter((o) => o && typeof o === "object")
    .map((o) => ({ value: o.image, name: o.label, src: o.image }));
}

export const KILLERS_CATALOG = buildCharacterCatalog("killers");
export const SURVIVORS_CATALOG = buildCharacterCatalog("survivors");

// Perks: catálogo global con personaje e inglés. value = nombre de archivo.
export const PERKS_CATALOG = GLOBAL_PERKS.map((p) => ({
  value: p.image, // nombre de archivo (identificador estable)
  name: p.name,
  src: perkImageSrc(p.image),
  character: p.character,
  english: p.english,
}));

// Devuelve el catálogo asociado a una ruleta por su id (o null si no aplica).
export function catalogForWheel(wheelId) {
  if (wheelId === "killers") return KILLERS_CATALOG;
  if (wheelId === "survivors") return SURVIVORS_CATALOG;
  if (wheelId === "perks-survivors") return PERKS_CATALOG;
  return null;
}

// Conjunto de identificadores del catálogo, para saber qué opciones de una
// ruleta pertenecen al catálogo (vs entradas especiales/manuales).
export function catalogValueSet(wheelId) {
  const cat = catalogForWheel(wheelId);
  return new Set(cat ? cat.map((it) => it.value) : []);
}

// Devuelve el identificador de catálogo (value) que corresponde a una opción de
// la ruleta, o null si la opción NO pertenece al catálogo (p. ej. entradas
// especiales/manuales). Perks: nombre de archivo; killers/survivors: ruta img.
export function optionCatalogValue(wheelId, option) {
  if (!option || typeof option !== "object" || !option.image) return null;
  let value;
  if (wheelId === "perks-survivors") {
    const parts = option.image.split("/");
    value = parts[parts.length - 1];
  } else {
    value = option.image;
  }
  return catalogValueSet(wheelId).has(value) ? value : null;
}
