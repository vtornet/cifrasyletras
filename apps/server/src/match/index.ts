// Orquestacion de partida en el servidor usando @duelo-lexico/game-engine - AGENTS.md #10
// El servidor es la unica fuente de verdad: decide quien elige vocales/numeros grandes,
// decide letras/numeros, controla el deadline de cada ronda (timestamp absoluto) y valida
// las respuestas antes de revelarlas.

import {
  advanceMatchState,
  applyRoundScores,
  BIG_NUMBERS,
  canFormWord,
  CHOICE_DURATION_MS,
  drawLetters,
  drawNumbers,
  findLongestValidWord,
  generateTarget,
  MAX_VOWELS,
  MIN_VOWELS,
  parseAndValidateSteps,
  ROUND_DURATION_MS,
  scoreLettersRound,
  scoreNumbersRound,
  solveNumbers,
  validateWord,
  type AnswerSubmitPayload,
  type ChoiceSubmitPayload,
  type LetterBagState,
  type RoundRevealPayload,
} from '@duelo-lexico/game-engine';
import type { AppServer, AppSocket, PendingChoice, Room } from '../rooms/index.js';

// Valores por defecto si el jugador en turno no elige a tiempo (o elige algo fuera de rango).
const DEFAULT_VOWEL_COUNT = 4;
const DEFAULT_BIG_NUMBER_COUNT = 2;

const REVEAL_PAUSE_MS = 3_000;

interface RoundContext {
  letters?: LetterBagState;
  numbers?: number[];
  target?: number;
}

const roundContexts = new WeakMap<Room, RoundContext>();

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const truncated = Math.trunc(value);
  return truncated >= min && truncated <= max ? truncated : fallback;
}

/** Inicia la fase de eleccion (vocales o numeros grandes) antes de repartir la ronda. */
export function startNextRound(io: AppServer, room: Room): void {
  const roundConfig = room.matchState.config.rounds[room.matchState.currentRoundIndex];
  if (!roundConfig) {
    endMatch(io, room);
    return;
  }

  room.currentRoundAnswers = new Map();
  const playerIds = Array.from(room.players.keys());
  // Alterna quien elige cada ronda: ronda 0 elige el primer jugador, ronda 1 el segundo, etc.
  const chooserPlayerId = playerIds[room.matchState.currentRoundIndex % playerIds.length]!;
  const { min, max } = roundConfig.kind === 'letters' ? { min: MIN_VOWELS, max: MAX_VOWELS } : { min: 0, max: BIG_NUMBERS.length };

  const pendingChoice: PendingChoice = { roundIndex: room.matchState.currentRoundIndex, chooserPlayerId, kind: roundConfig.kind };
  room.pendingChoice = pendingChoice;

  const deadline = Date.now() + CHOICE_DURATION_MS;
  room.choiceDeadline = deadline;
  io.to(room.roomId).emit('round:choosing', {
    roundIndex: pendingChoice.roundIndex,
    kind: pendingChoice.kind,
    chooserPlayerId,
    min,
    max,
    deadline,
  });

  room.choiceTimer = setTimeout(() => {
    resolveChoice(io, room, roundConfig.kind === 'letters' ? DEFAULT_VOWEL_COUNT : DEFAULT_BIG_NUMBER_COUNT);
  }, CHOICE_DURATION_MS);
}

/** Solo el jugador a quien le toca elegir puede resolver la eleccion pendiente. */
export function handleChoiceSubmit(io: AppServer, room: Room, playerId: string, payload: ChoiceSubmitPayload): void {
  if (!room.pendingChoice) return;
  if (payload.roundIndex !== room.pendingChoice.roundIndex) return;
  if (playerId !== room.pendingChoice.chooserPlayerId) return;
  if (room.choiceTimer) {
    clearTimeout(room.choiceTimer);
    room.choiceTimer = null;
  }
  resolveChoice(io, room, payload.count);
}

function resolveChoice(io: AppServer, room: Room, count: number): void {
  const pending = room.pendingChoice;
  if (!pending) return;
  room.pendingChoice = null;
  room.choiceDeadline = null;
  room.choiceTimer = null;

  const durationMs = ROUND_DURATION_MS[pending.kind];
  const deadline = Date.now() + durationMs;
  room.currentRoundDeadline = deadline;

  if (pending.kind === 'letters') {
    const vowelCount = clampInt(count, MIN_VOWELS, MAX_VOWELS, DEFAULT_VOWEL_COUNT);
    const letters = drawLetters({ vowelCount });
    roundContexts.set(room, { letters });
    io.to(room.roomId).emit('round:start', { roundIndex: pending.roundIndex, kind: 'letters', deadline, letters });
  } else {
    const bigNumberCount = clampInt(count, 0, BIG_NUMBERS.length, DEFAULT_BIG_NUMBER_COUNT);
    const numbers = drawNumbers({ bigNumberCount });
    const target = generateTarget();
    roundContexts.set(room, { numbers, target });
    io.to(room.roomId).emit('round:start', { roundIndex: pending.roundIndex, kind: 'numbers', deadline, numbers, target });
  }

  room.matchState = advanceMatchState(room.matchState); // choosing -> answering
  room.revealTimer = setTimeout(() => revealRound(io, room), durationMs);
}

/**
 * Reenvia al socket que se acaba de reconectar el estado vigente de la ronda (si lo hay):
 * la eleccion pendiente, o el round:start ya repartido. Sin esto, un jugador que se
 * reconecta a mitad de ronda se queda sin saber que letras/numeros estan en juego.
 */
export function sendCurrentRoundState(socket: AppSocket, room: Room): void {
  if (room.pendingChoice && room.choiceDeadline && Date.now() < room.choiceDeadline) {
    const { min, max } =
      room.pendingChoice.kind === 'letters' ? { min: MIN_VOWELS, max: MAX_VOWELS } : { min: 0, max: BIG_NUMBERS.length };
    socket.emit('round:choosing', {
      roundIndex: room.pendingChoice.roundIndex,
      kind: room.pendingChoice.kind,
      chooserPlayerId: room.pendingChoice.chooserPlayerId,
      min,
      max,
      deadline: room.choiceDeadline,
    });
    return;
  }

  if (!room.currentRoundDeadline || Date.now() >= room.currentRoundDeadline) return;
  const context = roundContexts.get(room);
  const roundConfig = room.matchState.config.rounds[room.matchState.currentRoundIndex];
  if (!context || !roundConfig) return;

  if (roundConfig.kind === 'letters' && context.letters) {
    socket.emit('round:start', {
      roundIndex: room.matchState.currentRoundIndex,
      kind: 'letters',
      deadline: room.currentRoundDeadline,
      letters: context.letters,
    });
  } else if (roundConfig.kind === 'numbers' && context.numbers && context.target !== undefined) {
    socket.emit('round:start', {
      roundIndex: room.matchState.currentRoundIndex,
      kind: 'numbers',
      deadline: room.currentRoundDeadline,
      numbers: context.numbers,
      target: context.target,
    });
  }
}

export function handleAnswerSubmit(
  io: AppServer,
  room: Room,
  playerId: string,
  payload: AnswerSubmitPayload,
): void {
  if (payload.roundIndex !== room.matchState.currentRoundIndex) return;
  if (!room.currentRoundDeadline || Date.now() > room.currentRoundDeadline) return;
  room.currentRoundAnswers.set(playerId, payload.answer);

  const allAnswered = room.players.size > 0 && room.currentRoundAnswers.size >= room.players.size;
  if (allAnswered && room.revealTimer) {
    clearTimeout(room.revealTimer);
    room.revealTimer = null;
    revealRound(io, room);
  }
}

function revealRound(io: AppServer, room: Room): void {
  const roundConfig = room.matchState.config.rounds[room.matchState.currentRoundIndex];
  const context = roundContexts.get(room);
  if (!roundConfig || !context) return;

  const playerIds = Array.from(room.players.keys());
  const answers: Record<string, string | null> = {};
  let roundScores: Record<string, number>;
  let reveal: RoundRevealPayload;

  if (roundConfig.kind === 'letters' && context.letters) {
    const letters = context.letters;
    const validWords: Record<string, string | null> = {};
    for (const playerId of playerIds) {
      const raw = room.currentRoundAnswers.get(playerId) ?? null;
      answers[playerId] = raw;
      validWords[playerId] = raw && canFormWord(raw, letters) && validateWord(raw).isValid ? raw : null;
    }
    roundScores = scoreLettersRound(validWords);
    room.matchState = applyRoundScores(room.matchState, roundScores);
    const bestWord = findLongestValidWord([...letters.vowels, ...letters.consonants]);
    reveal = {
      roundIndex: room.matchState.currentRoundIndex,
      kind: 'letters',
      answers,
      roundScores,
      totals: room.matchState.scores,
      solution: { word: bestWord },
    };
  } else if (roundConfig.kind === 'numbers' && context.numbers && context.target !== undefined) {
    const numbers = context.numbers;
    const target = context.target;
    const validResults: Record<string, number | null> = {};
    for (const playerId of playerIds) {
      const raw = room.currentRoundAnswers.get(playerId) ?? null;
      answers[playerId] = raw;
      const parsed = raw ? parseAndValidateSteps(raw, numbers) : null;
      validResults[playerId] = parsed?.isValid ? (parsed.finalResult ?? null) : null;
    }
    roundScores = scoreNumbersRound(validResults, target);
    room.matchState = applyRoundScores(room.matchState, roundScores);
    const solved = solveNumbers(numbers, target);
    reveal = {
      roundIndex: room.matchState.currentRoundIndex,
      kind: 'numbers',
      answers,
      roundScores,
      totals: room.matchState.scores,
      solution: { steps: solved.steps, value: solved.closestValue },
    };
  } else {
    return;
  }

  io.to(room.roomId).emit('round:reveal', reveal);

  room.matchState = advanceMatchState(room.matchState); // answering -> reveal
  room.matchState = advanceMatchState(room.matchState); // reveal -> siguiente choosing | finished

  if (room.matchState.phase === 'finished') {
    endMatch(io, room);
  } else {
    setTimeout(() => startNextRound(io, room), REVEAL_PAUSE_MS);
  }
}

function endMatch(io: AppServer, room: Room): void {
  const totals = room.matchState.scores;
  let winnerId: string | null = null;
  let maxScore = -1;
  let tie = false;
  for (const [playerId, score] of Object.entries(totals)) {
    if (score > maxScore) {
      maxScore = score;
      winnerId = playerId;
      tie = false;
    } else if (score === maxScore) {
      tie = true;
    }
  }
  io.to(room.roomId).emit('match:end', { totals, winnerId: tie ? null : winnerId });
}
