// Bolsa de numeros - AGENTS.md #6 (numbers/bag.ts) y R3.1
// Distribucion estandar del formato internacional: 2x cada numero 1-10 (20 fichas)
// + 1x cada numero grande 25/50/75/100 (4 fichas) = 24 fichas en la bolsa.

import { shuffle, type RandomFn } from '../shuffle.js';

export const SMALL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const BIG_NUMBERS = [25, 50, 75, 100] as const;
export const SMALL_NUMBER_COPIES = 2;
export const TOTAL_NUMBERS_DRAWN = 6;

export interface NumberDrawOptions {
  /** Cuantos numeros grandes (0-4) quiere el jugador en turno. */
  bigNumberCount: number;
}

/** Construye la bolsa de 24 fichas y extrae TOTAL_NUMBERS_DRAWN numeros respetando bigNumberCount. */
export function drawNumbers(options: NumberDrawOptions, rng: RandomFn = Math.random): number[] {
  const { bigNumberCount } = options;

  if (!Number.isInteger(bigNumberCount) || bigNumberCount < 0 || bigNumberCount > BIG_NUMBERS.length) {
    throw new Error(
      `bigNumberCount debe ser un entero entre 0 y ${BIG_NUMBERS.length} (recibido: ${bigNumberCount})`,
    );
  }

  const smallNumberCount = TOTAL_NUMBERS_DRAWN - bigNumberCount;
  const smallBag: number[] = [];
  for (const n of SMALL_NUMBERS) {
    for (let i = 0; i < SMALL_NUMBER_COPIES; i++) smallBag.push(n);
  }

  const bigDraw = shuffle(BIG_NUMBERS, rng).slice(0, bigNumberCount);
  const smallDraw = shuffle(smallBag, rng).slice(0, smallNumberCount);

  return shuffle([...bigDraw, ...smallDraw], rng);
}
