/**
 * Comprime todas las imágenes en public/pros/ con sharp.
 * Uso: npm run compress
 *
 * Redimensiona a máximo 1920px (sin agrandar) y re-guarda como JPEG
 * con calidad 82 y progressive. Típicamente reduce ~10MB → ~300KB.
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROS_DIR = path.join(__dirname, "..", "public", "pros");
const MAX_PX = 1920;
const QUALITY = 82;

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else if (/\.(jpe?g|png)$/i.test(entry.name)) results.push(full);
  }
  return results;
}

const files = walk(PROS_DIR);

if (files.length === 0) {
  console.log("No se encontraron imágenes en public/pros/");
  process.exit(0);
}

console.log(`Comprimiendo ${files.length} imágenes...\n`);

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const before = fs.statSync(file).size;
  totalBefore += before;

  const tmp = file + ".tmp";
  await sharp(file)
    .resize(MAX_PX, MAX_PX, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
    .toFile(tmp);

  const after = fs.statSync(tmp).size;
  totalAfter += after;
  fs.renameSync(tmp, file);

  const pct = Math.round((1 - after / before) * 100);
  console.log(
    `  ${path.relative(PROS_DIR, file).padEnd(35)} ${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024).toFixed(0).padStart(5)} KB  (-${pct}%)`
  );
}

console.log(
  `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)} MB → ${(totalAfter / 1024 / 1024).toFixed(1)} MB  (ahorro: ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}%)`
);
