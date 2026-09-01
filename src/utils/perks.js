import defaultWheels from "../data/defaultWheels.json";
import perkCharacters from "../data/perkCharacters.json";

// El listado global de perks se toma de la ruleta "Perks" (id: perks-survivors).
// Cada perk en esa ruleta es { label, image } donde image es una ruta tipo
// "/Images/Perks/xxx.webp". En rolesData/versiones se guarda como
// { name, image } donde image es solo el nombre de archivo ("xxx.webp").
// Estas utilidades normalizan entre ambos formatos.

const PERKS_WHEEL_ID = "perks-survivors";
// id anterior, por compatibilidad con datos guardados antiguos
const LEGACY_PERKS_WHEEL_ID = "hardcore-items";

function toFileName(imagePath) {
  if (!imagePath) return "";
  // Acepta "/Images/Perks/xxx.webp" o "xxx.webp"
  const parts = imagePath.split("/");
  return parts[parts.length - 1];
}

// Devuelve el personaje (superviviente) dueño de una perk a partir del nombre
// de archivo de su imagen. "General" para perks base/comunes, "" si se desconoce.
export function perkCharacter(fileName) {
  if (!fileName) return "";
  return perkCharacters[fileName] || "";
}

// Lista global de perks: [{ name, image, character }] (image = nombre de archivo).
export const GLOBAL_PERKS = (() => {
  const wheel =
    defaultWheels.find((w) => w.id === PERKS_WHEEL_ID) ||
    defaultWheels.find((w) => w.id === LEGACY_PERKS_WHEEL_ID);
  if (!wheel || !Array.isArray(wheel.options)) return [];
  return wheel.options
    .map((opt) => {
      const name = typeof opt === "object" ? opt.label : String(opt);
      const image = typeof opt === "object" ? toFileName(opt.image) : "";
      return { name, image, character: perkCharacter(image) || "General" };
    })
    .filter((p) => p.name);
})();

// Devuelve la ruta pública completa de la imagen de un perk a partir del
// nombre de archivo guardado en las versiones.
export function perkImageSrc(fileName) {
  if (!fileName) return "";
  if (fileName.startsWith("/")) return fileName;
  return `/Images/Perks/${fileName}`;
}

// Busca perks del listado global por texto (case-insensitive, sin acentos).
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchPerks(query) {
  const q = normalize(query).trim();
  if (!q) return GLOBAL_PERKS;
  // Coincide por nombre de la perk o por el personaje asociado
  return GLOBAL_PERKS.filter(
    (p) =>
      normalize(p.name).includes(q) ||
      normalize(p.character).includes(q)
  );
}

export const MAX_PERKS_PER_VERSION = 4;
