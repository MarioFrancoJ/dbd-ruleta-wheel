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

// Palabras que van en minúscula dentro del nombre en inglés (salvo la primera).
const ENGLISH_LOWERCASE_WORDS = new Set([
  "of", "the", "a", "an", "and", "in", "to", "for", "on", "with", "your",
]);

// Excepciones para nombres en inglés que el slug no reconstruye bien
// (apóstrofes, dos puntos, mayúsculas especiales, etc.).
const ENGLISH_NAME_OVERRIDES = {
  "salvations-cry.webp": "Salvation's Cry",
  "Salvations_Cry.webp": "Salvation's Cry",
  "boon-steadfast.webp": "Boon: Steadfast",
  "Boon_Steadfast.webp": "Boon: Steadfast",
  "boon-circle-of-healing.webp": "Boon: Circle of Healing",
  "boon-dark-theory.webp": "Boon: Dark Theory",
  "boon-exponential.webp": "Boon: Exponential",
  "boon-illumination.webp": "Boon: Illumination",
  "boon-shadow-step.webp": "Boon: Shadow Step",
  "invocation-treacherous-crows.webp": "Invocation: Treacherous Crows",
  "invocation-weaving-spiders.webp": "Invocation: Weaving Spiders",
  "teamwork-collective-stealth.webp": "Teamwork: Collective Stealth",
  "teamwork-full-circuit.webp": "Teamwork: Full Circuit",
  "teamwork-power-of-two.webp": "Teamwork: Power of Two",
  "teamwork-throw-down.webp": "Teamwork: Throw Down",
  "teamwork-toughen-up.webp": "Teamwork: Toughen Up",
  "no-mither.webp": "No Mither",
  "wake-up.webp": "Wake Up!",
  "were-gonna-live-forever.webp": "We're Gonna Live Forever",
  "well-make-it.webp": "We'll Make It",
  "detectives-hunch.webp": "Detective's Hunch",
  "plunderers-instinct.webp": "Plunderer's Instinct",
  "deja-vu.webp": "Déjà Vu",
  "come-and-get-me.webp": "Come and Get Me",
  "eyes-of-belmont.webp": "Eyes of Belmont",
  "a-place-for-us.webp": "A Place for Us",
};

// Devuelve el nombre en inglés de una perk a partir del nombre de archivo.
// Usa el slug del archivo (que corresponde al nombre oficial en inglés) y una
// tabla de excepciones para apóstrofes, dos puntos y acentos.
export function perkEnglishName(fileName) {
  const file = toFileName(fileName);
  if (!file) return "";
  if (ENGLISH_NAME_OVERRIDES[file]) return ENGLISH_NAME_OVERRIDES[file];
  const base = file.replace(/\.webp$/i, "");
  return base
    .split(/[-_]/)
    .map((word, i) => {
      const lw = word.toLowerCase();
      if (i > 0 && ENGLISH_LOWERCASE_WORDS.has(lw)) return lw;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
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
      return {
        name,
        image,
        character: perkCharacter(image) || "General",
        english: perkEnglishName(image),
      };
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
  // Coincide por nombre (español), nombre en inglés o personaje asociado
  return GLOBAL_PERKS.filter(
    (p) =>
      normalize(p.name).includes(q) ||
      normalize(p.english).includes(q) ||
      normalize(p.character).includes(q)
  );
}

export const MAX_PERKS_PER_VERSION = 4;
