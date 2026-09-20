// Generacion del numero objetivo - AGENTS.md #6 y R3.2

import type { RandomFn } from '../shuffle.js';

export const TARGET_MIN = 100;
export const TARGET_MAX = 999;

/** Genera un objetivo aleatorio en [TARGET_MIN, TARGET_MAX]. */
export function generateTarget(rng: RandomFn = Math.random): number {
  return TARGET_MIN + Math.floor(rng() * (TARGET_MAX - TARGET_MIN + 1));
}
