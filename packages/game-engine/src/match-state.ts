// Maquina de estados de la partida - AGENTS.md #6, #10
// Agnostica de si se ejecuta en cliente (modo Local) o servidor (modo Online).

export type RoundKind = 'letters' | 'numbers';

export type MatchPhase =
  | 'choosing' // el jugador en turno elige vocales o numeros grandes
  | 'answering' // cronometro en marcha, jugadores responden
  | 'reveal' // respuestas y puntuacion de la ronda mostradas
  | 'finished'; // partida completa, marcador final

export interface RoundConfig {
  kind: RoundKind;
  /** Indice de la ronda dentro de su tipo (0a de letras, 0a de cifras, etc). */
  index: number;
}

export interface MatchConfig {
  /** Secuencia de rondas de la partida, por defecto 5 letras + 5 cifras alternadas. */
  rounds: RoundConfig[];
}

export interface MatchState {
  config: MatchConfig;
  currentRoundIndex: number;
  phase: MatchPhase;
  scores: Record<string, number>;
}

/** Construye la secuencia de rondas por defecto: letras y cifras alternadas, empezando por letras. */
export function createDefaultMatchConfig(lettersRounds = 5, numbersRounds = 5): MatchConfig {
  const rounds: RoundConfig[] = [];
  let lettersPlaced = 0;
  let numbersPlaced = 0;
  let nextKind: RoundKind = 'letters';

  while (lettersPlaced < lettersRounds || numbersPlaced < numbersRounds) {
    const wantsLetters = nextKind === 'letters' && lettersPlaced < lettersRounds;
    const wantsNumbers = nextKind === 'numbers' && numbersPlaced < numbersRounds;

    if (wantsLetters) {
      rounds.push({ kind: 'letters', index: lettersPlaced });
      lettersPlaced++;
    } else if (wantsNumbers) {
      rounds.push({ kind: 'numbers', index: numbersPlaced });
      numbersPlaced++;
    } else if (lettersPlaced < lettersRounds) {
      rounds.push({ kind: 'letters', index: lettersPlaced });
      lettersPlaced++;
    } else {
      rounds.push({ kind: 'numbers', index: numbersPlaced });
      numbersPlaced++;
    }

    nextKind = nextKind === 'letters' ? 'numbers' : 'letters';
  }

  return { rounds };
}

/** Crea el estado inicial de una partida para el conjunto de jugadores dado. */
export function createInitialMatchState(config: MatchConfig, playerIds: string[]): MatchState {
  const scores: Record<string, number> = {};
  for (const playerId of playerIds) scores[playerId] = 0;
  return { config, currentRoundIndex: 0, phase: 'choosing', scores };
}

/** Suma los puntos de una ronda al marcador acumulado. */
export function applyRoundScores(state: MatchState, roundScores: Record<string, number>): MatchState {
  const scores = { ...state.scores };
  for (const [player, points] of Object.entries(roundScores)) {
    scores[player] = (scores[player] ?? 0) + points;
  }
  return { ...state, scores };
}

/** Transiciones de fase: choosing -> answering -> reveal -> siguiente ronda (choosing) | finished. */
export function advanceMatchState(state: MatchState): MatchState {
  switch (state.phase) {
    case 'choosing':
      return { ...state, phase: 'answering' };
    case 'answering':
      return { ...state, phase: 'reveal' };
    case 'reveal': {
      const nextIndex = state.currentRoundIndex + 1;
      if (nextIndex >= state.config.rounds.length) {
        return { ...state, phase: 'finished' };
      }
      return { ...state, currentRoundIndex: nextIndex, phase: 'choosing' };
    }
    case 'finished':
      return state;
  }
}
