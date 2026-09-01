import defaultWheels from "../data/defaultWheels.json";
import perkIndex from "../data/perkIndex.json";

// Fuente ÚNICA de las imágenes de perks: public/Images/PerksCharacters/, con
// una subcarpeta por personaje. El índice src/data/perkIndex.json (generado con
// `npm run gen:perks`) mapea cada archivo de perk a su carpeta y personaje:
//   { "self-care.webp": { character: "Claudette Morel", folder: "ClaudetteMorel" } }
//
// El listado global de perks se toma de la ruleta de perks (id: perks-survivors).
// Cada perk en esa ruleta es { label, image }. En las versiones de roles se
// guarda como { name, image }. En ambos casos `image` puede ser un nombre de
// archivo ("xxx.webp") o una ruta antigua ("/Images/Perks/xxx.webp"); estas
// utilidades normalizan cualquiera de los dos formatos.

const PERKS_WHEEL_ID = "perks-survivors";
// id anterior, por compatibilidad con datos guardados antiguos
const LEGACY_PERKS_WHEEL_ID = "hardcore-items";

// Carpeta del ícono especial (entradas libres tipo Comodín, Slot Vacío...).
const SPECIAL_ICON_PATH = "/Images/PerksCharacters/_Especiales/Random_Icon_Perk.webp";

function toFileName(imagePath) {
  if (!imagePath) return "";
  // Acepta "/Images/Perks/xxx.webp", "/Images/PerksCharacters/Foo/xxx.webp" o "xxx.webp"
  const parts = imagePath.split("/");
  return parts[parts.length - 1];
}

// Devuelve el personaje (superviviente) dueño de una perk a partir del nombre
// de archivo de su imagen. "General" para perks base/comunes, "" si se desconoce.
export function perkCharacter(fileName) {
  const file = toFileName(fileName);
  const entry = perkIndex[file];
  return entry ? entry.character : "";
}

// Devuelve la ruta pública completa de la imagen de una perk. Acepta tanto un
// nombre de archivo ("xxx.webp") como una ruta antigua ("/Images/Perks/xxx.webp")
// y la resuelve a la ubicación real en PerksCharacters/{personaje}/.
export function perkImageSrc(imageOrFile) {
  if (!imageOrFile) return "";
  const file = toFileName(imageOrFile);

  // Ícono especial de entradas libres
  if (file === "Random_Icon_Perk.webp") return SPECIAL_ICON_PATH;

  const entry = perkIndex[file];
  if (entry) return `/Images/PerksCharacters/${entry.folder}/${file}`;

  // Fallback: si ya venía como ruta absoluta, respetarla; si no, dejarla plana.
  if (imageOrFile.startsWith("/")) return imageOrFile;
  return `/Images/PerksCharacters/${file}`;
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
