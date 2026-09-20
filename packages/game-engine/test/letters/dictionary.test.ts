import { beforeEach, describe, expect, it } from 'vitest';
import {
  findLongestValidWord,
  MIN_VALID_WORD_LENGTH,
  setDictionary,
  validateWord,
  type Dictionary,
} from '../../src/letters/dictionary.js';

/** Diccionario de prueba en memoria: valido para tests, no para produccion. */
function createFakeDictionary(words: string[]): Dictionary {
  const set = new Set(words.map((w) => w.toLowerCase()));
  return {
    has: (word) => set.has(word),
    hasPrefix: (prefix) => {
      for (const word of set) {
        if (word.startsWith(prefix)) return true;
      }
      return false;
    },
  };
}

describe('validateWord', () => {
  beforeEach(() => {
    setDictionary(createFakeDictionary(['casa', 'casas', 'mesa', 'perro', 'perros']));
  });

  it('rechaza palabras mas cortas que MIN_VALID_WORD_LENGTH sin consultar el diccionario', () => {
    expect(MIN_VALID_WORD_LENGTH).toBe(5);
    const result = validateWord('casa');
    expect(result).toEqual({ word: 'casa', isValid: false, reason: 'too-short' });
  });

  it('acepta una palabra valida de longitud suficiente', () => {
    const result = validateWord('CASAS');
    expect(result).toEqual({ word: 'casas', isValid: true });
  });

  it('rechaza una palabra que no esta en el diccionario', () => {
    const result = validateWord('xxxxx');
    expect(result).toEqual({ word: 'xxxxx', isValid: false, reason: 'not-in-dictionary' });
  });
});

describe('findLongestValidWord', () => {
  beforeEach(() => {
    setDictionary(createFakeDictionary(['casa', 'casas', 'mesa', 'perro', 'perros']));
  });

  it('encuentra la palabra valida mas larga formable con las letras disponibles', () => {
    const letters = 'p e r r o s x'.split(' ');
    expect(findLongestValidWord(letters)).toBe('perros');
  });

  it('devuelve null si no hay ninguna palabla valida formable', () => {
    const letters = 'z z z z z'.split(' ');
    expect(findLongestValidWord(letters)).toBeNull();
  });
});
