#!/usr/bin/env node
// Copia el diccionario procesado (packages/game-engine/data/es-words.dict, formato
// "front coding" - ver docs/dictionary-license.md) a public/ para que Vite lo sirva
// como asset estatico y el service worker lo precachee (NFR1, R4.2). Se ejecuta antes
// de dev/build.

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(__dirname, '../../../packages/game-engine/data/es-words.dict');
const destDir = path.resolve(__dirname, '../public/dictionary');
const dest = path.join(destDir, 'es-words.dict');

async function main() {
  await mkdir(destDir, { recursive: true });
  await copyFile(source, dest);
  console.log(`Diccionario copiado a ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
