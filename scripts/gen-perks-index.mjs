// Genera el índice de perks a partir de la carpeta pública organizada por
// personaje: public/Images/PerksCharacters/{Personaje}/{archivo}.webp
//
// Fuente ÚNICA de verdad: las carpetas de PerksCharacters. Este script escribe
// src/data/perkIndex.json con, para cada archivo de perk:
//   { "archivo.webp": { "character": "Nombre Bonito", "folder": "NombreCarpeta" } }
//
// Uso: npm run gen:perks
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const PERKS_DIR = path.join(ROOT, "public/Images/PerksCharacters");
const OUT = path.join(ROOT, "src/data/perkIndex.json");

// Carpetas que no son personajes
const IGNORE_DIRS = new Set(["iconos perks", "_Especiales"]);

// Overrides de nombre de carpeta -> nombre bonito del personaje
const OVERRIDES = {
  Eleven: "Once",
  OrelaRose: "Orella Rose",
  TappDetective: "Detective Tapp",
  General: "General",
};

function prettify(dir) {
  return dir.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/-/g, " ");
}

const index = {};
const dirs = fs
  .readdirSync(PERKS_DIR)
  .filter(
    (d) =>
      fs.statSync(path.join(PERKS_DIR, d)).isDirectory() && !IGNORE_DIRS.has(d)
  )
  .sort();

for (const dir of dirs) {
  const character = OVERRIDES[dir] || prettify(dir);
  const files = fs
    .readdirSync(path.join(PERKS_DIR, dir))
    .filter((f) => f.toLowerCase().endsWith(".webp"));
  for (const file of files) {
    if (index[file]) {
      console.warn(
        `⚠️  Archivo duplicado en dos carpetas: ${file} (${index[file].folder} y ${dir})`
      );
    }
    index[file] = { character, folder: dir };
  }
}

fs.writeFileSync(OUT, JSON.stringify(index, null, 2) + "\n");
console.log(
  `✓ Escrito ${path.relative(ROOT, OUT)} con ${Object.keys(index).length} perks de ${dirs.length} personajes.`
);
