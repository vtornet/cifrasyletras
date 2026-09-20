// Bot del modo Rival CPU (Fase 2, R4.3) - AGENTS.md #6
// En vez de una IA compleja, el bot reutiliza el propio solver/dictionary del motor: solo
// "ve" un subconjunto aleatorio de las fichas repartidas (mas grande cuanto mayor la
// dificultad) y resuelve con eso lo mejor que puede. Un bot dificil ve casi todas las
// fichas y se acerca a la mejor respuesta posible; uno facil ve pocas y falla mas, ademas
// de tener mas probabilidad de "no llegar a tiempo" (missChance) y no responder nada.

import { findLongestValidWord } from '../letters/dictionary.js';
import { solveNumbers } from '../numbers/solver.js';
import type { ResolvedStep } from '../numbers/steps.js';
import { shuffle, type RandomFn } from '../shuffle.js';

export type CpuDifficulty = 'easy' | 'normal' | 'hard';

export interface CpuDifficultyConfig {
  /** Maximo de letras repartidas que el bot "ve" (el resto las ignora al buscar palabra). */
  letterSampleSize: number;
  /** Maximo de numeros repartidos que el bot "ve" al resolver cifras. */
  numberSampleSize: number;
  /** Probabilidad (0-1) de que el bot no de ninguna respuesta esa ronda. */
  missChance: number;
}

export const CPU_DIFFICULTY_CONFIG: Record<CpuDifficulty, CpuDifficultyConfig> = {
  easy: { letterSampleSize: 6, numberSampleSize: 3, missChance: 0.35 },
  normal: { letterSampleSize: 8, numberSampleSize: 4, missChance: 0.15 },
  hard: { letterSampleSize: 10, numberSampleSize: 6, missChance: 0 },
};

/** Mejor palabra que el bot es capaz de encontrar, o null si falla/no responde. */
export function cpuAnswerLetters(
  letters: readonly string[],
  difficulty: CpuDifficulty,
  rng: RandomFn = Math.random,
): string | null {
  const config = CPU_DIFFICULTY_CONFIG[difficulty];
  if (rng() < config.missChance) return null;
  const sampleSize = Math.min(config.letterSampleSize, letters.length);
  const sample = shuffle(letters, rng).slice(0, sampleSize);
  return findLongestValidWord(sample);
}

export interface CpuNumbersAnswer {
  steps: ResolvedStep[];
  value: number;
}

/** Mejor cadena de pasos que el bot es capaz de resolver, o null si falla/no responde. */
export function cpuAnswerNumbers(
  numbers: readonly number[],
  target: number,
  difficulty: CpuDifficulty,
  rng: RandomFn = Math.random,
): CpuNumbersAnswer | null {
  const config = CPU_DIFFICULTY_CONFIG[difficulty];
  if (rng() < config.missChance) return null;
  const sampleSize = Math.min(config.numberSampleSize, numbers.length);
  const sample = shuffle(numbers, rng).slice(0, sampleSize);
  const solved = solveNumbers(sample, target);
  return { steps: solved.steps, value: solved.closestValue };
}
