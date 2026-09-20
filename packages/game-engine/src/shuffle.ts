// Utilidad compartida de barajado (Fisher-Yates) con RNG inyectable para tests deterministas.

export type RandomFn = () => number;

export function shuffle<T>(items: readonly T[], rng: RandomFn = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}
