// Calculo de puntuacion - AGENTS.md #6 y R2.4, R3.6

export const EXACT_NUMBER_POINTS = 10;
export const APPROX_NUMBER_POINTS = 7;
export const MAX_APPROX_DISTANCE = 10;

/**
 * Letras: 1 punto por letra de la palabra valida mas larga; empate reparte puntos a ambos
 * (ambos reciben el maximo, no se divide). wordsByPlayer debe contener solo palabras ya
 * validadas por letters/dictionary.ts, o null si el jugador no dio una respuesta valida.
 */
export function scoreLettersRound(wordsByPlayer: Record<string, string | null>): Record<string, number> {
  const lengths: Record<string, number> = {};
  let maxLength = 0;
  for (const [player, word] of Object.entries(wordsByPlayer)) {
    const length = word ? word.length : 0;
    lengths[player] = length;
    if (length > maxLength) maxLength = length;
  }

  const scores: Record<string, number> = {};
  for (const player of Object.keys(wordsByPlayer)) {
    scores[player] = maxLength > 0 && lengths[player] === maxLength ? maxLength : 0;
  }
  return scores;
}

/**
 * Cifras: 10 pts resultado exacto, 7 pts mejor aproximacion valida; empate reparte puntos
 * a ambos (ambos reciben el mismo puntaje, no se divide). resultsByPlayer debe contener solo
 * resultados ya validados por numbers/parser.ts, o null si el jugador no dio una respuesta valida.
 */
export function scoreNumbersRound(
  resultsByPlayer: Record<string, number | null>,
  target: number,
): Record<string, number> {
  const distances: Record<string, number> = {};
  let minDistance = Number.POSITIVE_INFINITY;
  for (const [player, result] of Object.entries(resultsByPlayer)) {
    const distance = result === null ? Number.POSITIVE_INFINITY : Math.abs(result - target);
    distances[player] = distance;
    if (distance < minDistance) minDistance = distance;
  }

  const scores: Record<string, number> = {};
  for (const player of Object.keys(resultsByPlayer)) {
    if (!Number.isFinite(minDistance) || distances[player] !== minDistance) {
      scores[player] = 0;
      continue;
    }
    scores[player] = minDistance === 0 ? EXACT_NUMBER_POINTS : APPROX_NUMBER_POINTS;
  }
  return scores;
}

/**
 * Cifras en solitario (modo Local, sin rival con quien comparar distancias): exacto = 10 pts,
 * a MAX_APPROX_DISTANCE o menos del objetivo = 7 pts, mas lejos = 0 pts. scoreNumbersRound()
 * no sirve aqui porque con un solo jugador "el mas cercano" es siempre el propio jugador,
 * premiando con APPROX_NUMBER_POINTS cualquier respuesta valida sin importar cuan lejos este
 * del objetivo.
 */
export function scoreNumbersSolo(result: number | null, target: number): number {
  if (result === null) return 0;
  const distance = Math.abs(result - target);
  if (distance === 0) return EXACT_NUMBER_POINTS;
  if (distance <= MAX_APPROX_DISTANCE) return APPROX_NUMBER_POINTS;
  return 0;
}
