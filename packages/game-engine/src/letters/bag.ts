// Bombo de letras - AGENTS.md #6 (letters/bag.ts) y R2.1
// Distribucion de frecuencia aproximada al espanol (ver AGENTS.md #9 - no es la exacta de RTVE,
// no es publica). Se simulan dos bombos separados (vocales / consonantes), como en el programa.

import { shuffle, type RandomFn } from '../shuffle.js';

export type Letter = string;

/** Frecuencias aproximadas de vocales en espanol (numero de fichas en el bombo). */
export const VOWEL_FREQUENCIES: Readonly<Record<string, number>> = {
  A: 12,
  E: 12,
  I: 6,
  O: 9,
  U: 5,
};

/** Frecuencias aproximadas de consonantes en espanol (numero de fichas en el bombo). */
export const CONSONANT_FREQUENCIES: Readonly<Record<string, number>> = {
  S: 6,
  N: 5,
  R: 5,
  L: 4,
  D: 5,
  T: 4,
  C: 4,
  M: 2,
  P: 2,
  B: 2,
  G: 2,
  H: 2,
  F: 1,
  V: 1,
  Y: 1,
  Q: 1,
  Z: 1,
  J: 1,
  Ñ: 1,
  X: 1,
};

export const MIN_VOWELS = 3;
export const MAX_VOWELS = 6;
export const DEFAULT_TOTAL_LETTERS = 10;

export interface LetterDrawOptions {
  /** Numero de vocales elegidas por el jugador en turno (3-6). */
  vowelCount: number;
  /** Total de letras del bombo (10 en el formato original). */
  totalLetters?: number;
}

export interface LetterBagState {
  vowels: Letter[];
  consonants: Letter[];
}

function expandFrequencyTable(frequencies: Readonly<Record<string, number>>): Letter[] {
  const pool: Letter[] = [];
  for (const [letter, count] of Object.entries(frequencies)) {
    for (let i = 0; i < count; i++) pool.push(letter);
  }
  return pool;
}

/**
 * Extrae vowelCount vocales y (totalLetters - vowelCount) consonantes de bombos
 * independientes, sin repetir mas fichas de las que existen en cada distribucion.
 */
export function drawLetters(options: LetterDrawOptions, rng: RandomFn = Math.random): LetterBagState {
  const totalLetters = options.totalLetters ?? DEFAULT_TOTAL_LETTERS;
  const { vowelCount } = options;

  if (!Number.isInteger(vowelCount) || vowelCount < MIN_VOWELS || vowelCount > MAX_VOWELS) {
    throw new Error(`vowelCount debe ser un entero entre ${MIN_VOWELS} y ${MAX_VOWELS} (recibido: ${vowelCount})`);
  }

  const consonantCount = totalLetters - vowelCount;
  if (consonantCount < 0) {
    throw new Error(`totalLetters (${totalLetters}) no puede ser menor que vowelCount (${vowelCount})`);
  }

  const vowelPool = shuffle(expandFrequencyTable(VOWEL_FREQUENCIES), rng);
  const consonantPool = shuffle(expandFrequencyTable(CONSONANT_FREQUENCIES), rng);

  if (vowelCount > vowelPool.length) {
    throw new Error(`No hay suficientes vocales en el bombo para extraer ${vowelCount}`);
  }
  if (consonantCount > consonantPool.length) {
    throw new Error(`No hay suficientes consonantes en el bombo para extraer ${consonantCount}`);
  }

  return {
    vowels: vowelPool.slice(0, vowelCount),
    consonants: consonantPool.slice(0, consonantCount),
  };
}

/**
 * Comprueba que word se pueda formar solo con las letras del bombo repartido, sin usar
 * una letra mas veces de las que aparece. Necesario ademas de la validacion del
 * diccionario: sin esto, un jugador podria escribir cualquier palabra valida del
 * diccionario sin relacion con las letras que se le repartieron.
 */
export function canFormWord(word: string, bag: LetterBagState): boolean {
  const available = new Map<string, number>();
  for (const letter of [...bag.vowels, ...bag.consonants]) {
    const key = letter.toLowerCase();
    available.set(key, (available.get(key) ?? 0) + 1);
  }

  for (const char of word.toLowerCase()) {
    const remaining = available.get(char) ?? 0;
    if (remaining <= 0) return false;
    available.set(char, remaining - 1);
  }
  return true;
}
