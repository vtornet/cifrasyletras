// Orquestacion del modo Local (1 jugador) - R2.1, R3.1, R4.1, R4.2. Usa
// @duelo-lexico/game-engine directamente en el cliente, sin red. A diferencia del modo
// Online, aqui no hace falta esperar a nadie: al enviar una respuesta se revela al
// instante (o al agotarse el tiempo), y la eleccion de vocales/numeros grandes no tiene
// cronometro propio (no hay rival al que hacer esperar en modo solitario).

import {
  applyRoundScores,
  BIG_NUMBERS,
  canFormWord,
  cpuAnswerLetters,
  cpuAnswerNumbers,
  createDefaultMatchConfig,
  createInitialMatchState,
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
  scoreNumbersSolo,
  solveNumbers,
  validateWord,
  type CpuDifficulty,
  type LetterBagState,
  type MatchState,
  type ResolvedStep,
  type RoundKind,
} from '@duelo-lexico/game-engine';
import { create } from 'zustand';
import { saveMatch } from './stats.js';

export const LOCAL_PLAYER_ID = 'Tú';
export const CPU_PLAYER_ID = 'CPU';

const DEFAULT_VOWEL_COUNT = 4;
const DEFAULT_BIG_NUMBER_COUNT = 2;

export type LocalPhase = 'idle' | 'choosing' | 'answering' | 'reveal' | 'finished';

export interface RoundHistoryEntry {
  kind: RoundKind;
  answer: string | null;
  points: number;
  bestWord?: string | null;
  bestSteps?: ResolvedStep[];
  bestValue?: number;
  target?: number;
  cpuAnswer?: string | null;
  cpuPoints?: number;
}

interface LocalMatchStore {
  phase: LocalPhase;
  matchState: MatchState | null;
  /** null = practica en solitario; con dificultad = partida contra el bot (R4.3). */
  opponent: CpuDifficulty | null;
  letters: LetterBagState | null;
  numbers: number[] | null;
  target: number | null;
  deadline: number | null;
  lastAnswer: string | null;
  lastAnswerSteps: ResolvedStep[] | null;
  lastPoints: number;
  lastBestWord: string | null;
  lastBestSteps: ResolvedStep[] | null;
  lastBestValue: number | null;
  lastCpuAnswer: string | null;
  lastCpuAnswerSteps: ResolvedStep[] | null;
  lastCpuPoints: number;
  history: RoundHistoryEntry[];
  totalScore: number;
  cpuTotalScore: number;

  startMatch: (opponent?: CpuDifficulty | null) => void;
  submitChoice: (count: number) => void;
  submitAnswer: (answer: string) => void;
  timeUp: () => void;
  continueToNextRound: () => void;
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const truncated = Math.trunc(value);
  return truncated >= min && truncated <= max ? truncated : fallback;
}

function startRound(): Partial<LocalMatchStore> {
  return { phase: 'choosing', letters: null, numbers: null, target: null, deadline: null };
}

export const useLocalMatchStore = create<LocalMatchStore>((set, get) => ({
  phase: 'idle',
  matchState: null,
  opponent: null,
  letters: null,
  numbers: null,
  target: null,
  deadline: null,
  lastAnswer: null,
  lastAnswerSteps: null,
  lastPoints: 0,
  lastBestWord: null,
  lastBestSteps: null,
  lastBestValue: null,
  lastCpuAnswer: null,
  lastCpuAnswerSteps: null,
  lastCpuPoints: 0,
  history: [],
  totalScore: 0,
  cpuTotalScore: 0,

  startMatch: (opponent = null) => {
    const config = createDefaultMatchConfig();
    const playerIds = opponent ? [LOCAL_PLAYER_ID, CPU_PLAYER_ID] : [LOCAL_PLAYER_ID];
    const matchState = createInitialMatchState(config, playerIds);
    set({ matchState, opponent, history: [], totalScore: 0, cpuTotalScore: 0, ...startRound() });
  },

  submitChoice: (count) => {
    const { matchState, phase } = get();
    if (!matchState || phase !== 'choosing') return;
    const roundConfig = matchState.config.rounds[matchState.currentRoundIndex]!;
    const deadline = Date.now() + ROUND_DURATION_MS[roundConfig.kind];

    if (roundConfig.kind === 'letters') {
      const vowelCount = clampInt(count, MIN_VOWELS, MAX_VOWELS, DEFAULT_VOWEL_COUNT);
      const letters = drawLetters({ vowelCount });
      set({ phase: 'answering', letters, numbers: null, target: null, deadline });
    } else {
      const bigNumberCount = clampInt(count, 0, BIG_NUMBERS.length, DEFAULT_BIG_NUMBER_COUNT);
      const numbers = drawNumbers({ bigNumberCount });
      const target = generateTarget();
      set({ phase: 'answering', letters: null, numbers, target, deadline });
    }
  },

  submitAnswer: (answer) => {
    const { matchState, opponent, letters, numbers, target } = get();
    if (!matchState || get().phase !== 'answering') return;
    const roundConfig = matchState.config.rounds[matchState.currentRoundIndex]!;
    const trimmed = answer.trim();

    let points = 0;
    let cpuPoints = 0;
    let bestWord: string | null = null;
    let bestSteps: ResolvedStep[] | null = null;
    let bestValue: number | null = null;
    let answerSteps: ResolvedStep[] | null = null;
    let cpuWord: string | null = null;
    let cpuSteps: ResolvedStep[] | null = null;

    if (roundConfig.kind === 'letters' && letters) {
      const allLetters = [...letters.vowels, ...letters.consonants];
      const isValid = trimmed.length > 0 && canFormWord(trimmed, letters) && validateWord(trimmed).isValid;
      bestWord = findLongestValidWord(allLetters);

      if (opponent) {
        cpuWord = cpuAnswerLetters(allLetters, opponent);
        const scores = scoreLettersRound({
          [LOCAL_PLAYER_ID]: isValid ? trimmed : null,
          [CPU_PLAYER_ID]: cpuWord,
        });
        points = scores[LOCAL_PLAYER_ID] ?? 0;
        cpuPoints = scores[CPU_PLAYER_ID] ?? 0;
      } else {
        const scores = scoreLettersRound({ [LOCAL_PLAYER_ID]: isValid ? trimmed : null });
        points = scores[LOCAL_PLAYER_ID] ?? 0;
      }
    } else if (roundConfig.kind === 'numbers' && numbers && target !== null) {
      const parsed = trimmed.length > 0 ? parseAndValidateSteps(trimmed, numbers) : null;
      const value = parsed?.isValid ? (parsed.finalResult ?? null) : null;
      answerSteps = parsed?.isValid ? (parsed.steps ?? []) : null;
      const solved = solveNumbers(numbers, target);
      bestSteps = solved.steps;
      bestValue = solved.closestValue;

      if (opponent) {
        const cpuAnswer = cpuAnswerNumbers(numbers, target, opponent);
        cpuSteps = cpuAnswer?.steps ?? null;
        const scores = scoreNumbersRound(
          { [LOCAL_PLAYER_ID]: value, [CPU_PLAYER_ID]: cpuAnswer?.value ?? null },
          target,
        );
        points = scores[LOCAL_PLAYER_ID] ?? 0;
        cpuPoints = scores[CPU_PLAYER_ID] ?? 0;
      } else {
        points = scoreNumbersSolo(value, target);
      }
    }

    const roundScores: Record<string, number> = { [LOCAL_PLAYER_ID]: points };
    if (opponent) roundScores[CPU_PLAYER_ID] = cpuPoints;
    const newMatchState = applyRoundScores(matchState, roundScores);

    const cpuAnswerLabel = cpuWord ?? (cpuSteps && cpuSteps.length > 0 ? String(cpuSteps[cpuSteps.length - 1]!.result) : null);
    const historyEntry: RoundHistoryEntry = {
      kind: roundConfig.kind,
      answer: trimmed.length > 0 ? trimmed : null,
      points,
      bestWord,
      ...(bestSteps !== null ? { bestSteps } : {}),
      ...(bestValue !== null ? { bestValue } : {}),
      ...(target !== null ? { target } : {}),
      ...(opponent ? { cpuAnswer: cpuAnswerLabel, cpuPoints } : {}),
    };

    set((state) => ({
      phase: 'reveal',
      matchState: newMatchState,
      lastAnswer: trimmed.length > 0 ? trimmed : null,
      lastAnswerSteps: answerSteps,
      lastPoints: points,
      lastBestWord: bestWord,
      lastBestSteps: bestSteps,
      lastBestValue: bestValue,
      lastCpuAnswer: cpuAnswerLabel,
      lastCpuAnswerSteps: cpuSteps,
      lastCpuPoints: cpuPoints,
      totalScore: newMatchState.scores[LOCAL_PLAYER_ID] ?? 0,
      cpuTotalScore: opponent ? (newMatchState.scores[CPU_PLAYER_ID] ?? 0) : state.cpuTotalScore,
      history: [...state.history, historyEntry],
    }));
  },

  timeUp: () => {
    if (get().phase === 'answering') get().submitAnswer('');
  },

  continueToNextRound: () => {
    const { matchState, history, totalScore } = get();
    if (!matchState) return;
    const nextIndex = matchState.currentRoundIndex + 1;
    if (nextIndex >= matchState.config.rounds.length) {
      set({ phase: 'finished' });
      void saveMatch({ id: crypto.randomUUID(), playedAt: Date.now(), totalScore, rounds: history });
      return;
    }
    const advanced = { ...matchState, currentRoundIndex: nextIndex };
    set({ matchState: advanced, ...startRound() });
  },
}));
