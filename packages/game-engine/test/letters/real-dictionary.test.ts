// Test de integracion con el diccionario real (packages/game-engine/data/es-words.dict,
// formato binario "front coding" - ver dictionary-codec.ts). Ver docs/dictionary-license.md
// para el origen y procesado de estos datos.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { decodeFrontCoded } from '../../src/letters/dictionary-codec.js';
import {
  createSortedArrayDictionary,
  findLongestValidWord,
  setDictionary,
  validateWord,
} from '../../src/letters/dictionary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictPath = path.resolve(__dirname, '../../data/es-words.dict');
const words = decodeFrontCoded(new Uint8Array(readFileSync(dictPath)));

describe('diccionario real (es-words.dict)', () => {
  beforeAll(() => {
    setDictionary(createSortedArrayDictionary(words));
  });

  it('tiene un tamano razonable y esta ordenado', () => {
    expect(words.length).toBeGreaterThan(100_000);
    const sample = words;
    for (let i = 1; i < 1000; i++) {
      expect(sample[i - 1]! <= sample[i]!).toBe(true);
    }
  });

  it('valida palabras comunes reales', () => {
    expect(validateWord('ordenador')).toEqual({ word: 'ordenador', isValid: true });
    expect(validateWord('casa')).toEqual({ word: 'casa', isValid: false, reason: 'too-short' });
    expect(validateWord('xxqzxx').isValid).toBe(false);
  });

  it('encuentra una palabra valida larga a partir de un juego de letras plausible', () => {
    // letras suficientes para formar "ordenador" (o.r.d.e.n.a.d.o.r) + una consonante extra
    const letters = 'o r d e n a d o r s'.split(' ');
    const found = findLongestValidWord(letters);
    expect(found).not.toBeNull();
    expect(found!.length).toBeGreaterThanOrEqual(5);
    // toda palabra encontrada debe ser realmente valida
    expect(validateWord(found!).isValid).toBe(true);
  });
});
