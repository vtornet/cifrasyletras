// Validacion de palabras contra el diccionario embebido - AGENTS.md #12 y R2.3
// Origen/licencia del listado de palabras real: pendiente, ver docs/dictionary-license.md.
// Mientras tanto, el diccionario es inyectable (setDictionary) para poder desarrollar y
// testear el resto del motor sin depender de esa decision.

export const MIN_VALID_WORD_LENGTH = 5;

export interface WordValidationResult {
  word: string;
  isValid: boolean;
  reason?: 'too-short' | 'not-in-dictionary';
}

/**
 * Fuente de palabras validas. hasPrefix() permite podar la busqueda en
 * findLongestValidWord() sin tener que probar todas las permutaciones posibles
 * (ver docs/dictionary-license.md para el formato de datos real, p. ej. un trie).
 */
export interface Dictionary {
  has(word: string): boolean;
  hasPrefix(prefix: string): boolean;
}

/**
 * Implementacion de referencia de Dictionary: busqueda binaria sobre un array de
 * palabras ya ordenado lexicograficamente (orden ordinal UTF-16, el que usa por
 * defecto Array.prototype.sort) y en minusculas. Es la que usan apps/web y
 * apps/server con el diccionario real generado por scripts/build-dictionary.mjs
 * (ver docs/dictionary-license.md) — O(log n) para has(), O(log n) para hasPrefix().
 */
export function createSortedArrayDictionary(sortedWords: readonly string[]): Dictionary {
  function lowerBound(target: string): number {
    let lo = 0;
    let hi = sortedWords.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sortedWords[mid]! < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  return {
    has(word) {
      const idx = lowerBound(word);
      return idx < sortedWords.length && sortedWords[idx] === word;
    },
    hasPrefix(prefix) {
      const idx = lowerBound(prefix);
      return idx < sortedWords.length && (sortedWords[idx]?.startsWith(prefix) ?? false);
    },
  };
}

let activeDictionary: Dictionary | null = null;

/** Configura el diccionario activo (llamar una vez al arrancar cliente/servidor). */
export function setDictionary(dictionary: Dictionary): void {
  activeDictionary = dictionary;
}

function requireDictionary(): Dictionary {
  if (!activeDictionary) {
    throw new Error(
      'Dictionary no configurado: llama a setDictionary() antes de validar palabras (ver docs/dictionary-license.md)',
    );
  }
  return activeDictionary;
}

/** Valida que la palabra exista en el diccionario activo y cumpla MIN_VALID_WORD_LENGTH. */
export function validateWord(word: string): WordValidationResult {
  const normalized = word.trim().toLowerCase();
  if (normalized.length < MIN_VALID_WORD_LENGTH) {
    return { word: normalized, isValid: false, reason: 'too-short' };
  }
  const dictionary = requireDictionary();
  if (dictionary.has(normalized)) {
    return { word: normalized, isValid: true };
  }
  return { word: normalized, isValid: false, reason: 'not-in-dictionary' };
}

/**
 * DFS acotada por hasPrefix() sobre el multiconjunto de letras disponibles para encontrar
 * la palabra valida mas larga formable. Usado por el modo CPU (Fase 2) y por tests.
 */
export function findLongestValidWord(availableLetters: string[]): string | null {
  const dictionary = requireDictionary();
  const letters = availableLetters.map((l) => l.toLowerCase());
  let best: string | null = null;

  function dfs(current: string, remaining: string[]): void {
    if (current.length >= MIN_VALID_WORD_LENGTH && dictionary.has(current)) {
      if (!best || current.length > best.length) best = current;
    }
    for (let i = 0; i < remaining.length; i++) {
      const next = current + remaining[i];
      if (!dictionary.hasPrefix(next)) continue;
      const rest = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      dfs(next, rest);
    }
  }

  dfs('', letters);
  return best;
}
