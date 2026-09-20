// Carga del diccionario real al arrancar el servidor - ver docs/dictionary-license.md
// El archivo esta en el formato binario "front coding" de dictionary-codec.ts (mas
// ligero que JSON plano); require.resolve() localiza el subpath del paquete y luego
// se lee como bytes crudos (no es JSON, asi que no se puede usar require() directo).

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createSortedArrayDictionary, decodeFrontCoded, setDictionary } from '@duelo-lexico/game-engine';

const require = createRequire(import.meta.url);

export function initDictionary(): number {
  const dictPath = require.resolve('@duelo-lexico/game-engine/dictionary-data');
  const bytes = readFileSync(dictPath);
  const words = decodeFrontCoded(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  setDictionary(createSortedArrayDictionary(words));
  return words.length;
}
