/**
 * Régénère les visuels éditoriaux WebP versionnés à partir des PNG d'origine.
 * Les PNG restent hors dépôt (`.gitignore`) : ce script n'est utile qu'à qui
 * détient les sources et veut réencoder après un ajout ou un remplacement.
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(import.meta.dirname, "..", "public", "images", "editorial");
const QUALITY = 82;

const sources = (await readdir(DIR)).filter((name) => name.endsWith(".png")).sort();
if (sources.length === 0) throw new Error(`Aucun PNG source dans ${DIR}.`);

let before = 0;
let after = 0;

for (const name of sources) {
  const from = path.join(DIR, name);
  const to = path.join(DIR, name.replace(/\.png$/, ".webp"));

  // `effort: 6` coûte quelques secondes de plus mais gagne ~10 % de poids.
  await sharp(from).webp({ quality: QUALITY, effort: 6 }).toFile(to);

  const source = (await stat(from)).size;
  const output = (await stat(to)).size;
  before += source;
  after += output;
  console.log(`${name.padEnd(38)} ${(source / 1048576).toFixed(2)} Mo -> ${(output / 1048576).toFixed(2)} Mo`);
}

console.log(`\n${sources.length} images : ${(before / 1048576).toFixed(1)} Mo -> ${(after / 1048576).toFixed(1)} Mo (-${(100 - (after / before) * 100).toFixed(1)} %)`);
