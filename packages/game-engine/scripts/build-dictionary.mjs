#!/usr/bin/env node
// Genera packages/game-engine/data/es-words.dict a partir de la fuente documentada
// en docs/dictionary-license.md. Reproducible: no depende de ningun archivo temporal,
// solo de la descarga de la fuente original.
//
// El archivo de salida usa el formato binario "front coding" de dictionary-codec.ts
// (~70% mas ligero que el JSON plano, ver docs/dictionary-license.md) en vez de JSON,
// para reducir el peso que descarga/cachea la PWA.
//
// Uso: pnpm --filter @duelo-lexico/game-engine build:dictionary

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeFrontCoded } from '../src/letters/dictionary-codec.js';

const SOURCE_URL = 'https://raw.githubusercontent.com/words/an-array-of-spanish-words/master/index.json';
const MIN_LENGTH = 5; // AGENTS.md R2.3 / letters/dictionary.ts MIN_VALID_WORD_LENGTH
const VALID_WORD = /^[a-zñ]+$/; // sin tildes: el bombo de letras no tiene fichas acentuadas (ver AGENTS.md #9)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../data');
const outFile = path.join(outDir, 'es-words.dict');

async function main() {
  console.log(`Descargando lista de palabras desde ${SOURCE_URL} ...`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Descarga fallida: HTTP ${response.status}`);
  }
  const raw = await response.json();
  console.log(`Palabras en bruto: ${raw.length}`);

  const filtered = raw.filter((word) => word.length >= MIN_LENGTH && VALID_WORD.test(word));
  const unique = Array.from(new Set(filtered));
  // Orden ordinal (UTF-16) por defecto de Array.prototype.sort: es el que asume la
  // busqueda binaria de createSortedArrayDictionary en letters/dictionary.ts.
  unique.sort();

  console.log(`Palabras validas (longitud >= ${MIN_LENGTH}, solo a-z y ñ, sin duplicados): ${unique.length}`);

  const encoded = encodeFrontCoded(unique);
  console.log(`Tamano comprimido (front coding): ${(encoded.byteLength / 1024 / 1024).toFixed(2)} MB`);

  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, encoded);
  console.log(`Escrito: ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
