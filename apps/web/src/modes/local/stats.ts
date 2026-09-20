// Estadisticas persistentes del modo Practica (R4.1) - IndexedDB via idb.
// Cada partida terminada se guarda con su resumen de rondas; de ahi se calculan
// agregados (mejor puntuacion, mejor palabra, etc.) para la pantalla de estadisticas.

import { EXACT_NUMBER_POINTS } from '@duelo-lexico/game-engine';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { RoundHistoryEntry } from './store.js';

export interface StoredMatch {
  id: string;
  playedAt: number; // Date.now()
  totalScore: number;
  rounds: RoundHistoryEntry[];
}

export interface AggregatedStats {
  matchesPlayed: number;
  bestScore: number;
  averageScore: number;
  bestWord: string | null;
  bestNumbersExactCount: number;
}

interface StatsDB extends DBSchema {
  matches: {
    key: string;
    value: StoredMatch;
    indexes: { 'by-playedAt': number };
  };
}

const DB_NAME = 'duelo-lexico-stats';
const DB_VERSION = 1;
const STORE_NAME = 'matches';

let dbPromise: Promise<IDBPDatabase<StatsDB>> | null = null;

function getDb(): Promise<IDBPDatabase<StatsDB>> {
  dbPromise ??= openDB<StatsDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('by-playedAt', 'playedAt');
    },
  });
  return dbPromise;
}

/** Guarda una partida terminada. No lanza si IndexedDB no esta disponible (modo privado, etc). */
export async function saveMatch(match: StoredMatch): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, match);
  } catch (err) {
    console.error('No se pudo guardar la partida en IndexedDB', err);
  }
}

/** Partidas guardadas, mas recientes primero. Devuelve [] si IndexedDB no esta disponible. */
export async function listMatches(): Promise<StoredMatch[]> {
  try {
    const db = await getDb();
    const all = await db.getAllFromIndex(STORE_NAME, 'by-playedAt');
    return all.reverse();
  } catch (err) {
    console.error('No se pudieron leer las partidas de IndexedDB', err);
    return [];
  }
}

function aggregate(matches: StoredMatch[]): AggregatedStats {
  if (matches.length === 0) {
    return { matchesPlayed: 0, bestScore: 0, averageScore: 0, bestWord: null, bestNumbersExactCount: 0 };
  }

  let bestScore = 0;
  let totalScore = 0;
  let bestWord: string | null = null;
  let bestNumbersExactCount = 0;

  for (const match of matches) {
    totalScore += match.totalScore;
    if (match.totalScore > bestScore) bestScore = match.totalScore;

    for (const round of match.rounds) {
      if (round.kind === 'letters' && round.answer && (!bestWord || round.answer.length > bestWord.length)) {
        bestWord = round.answer;
      }
      if (round.kind === 'numbers' && round.points === EXACT_NUMBER_POINTS) {
        bestNumbersExactCount++;
      }
    }
  }

  return {
    matchesPlayed: matches.length,
    bestScore,
    averageScore: totalScore / matches.length,
    bestWord,
    bestNumbersExactCount,
  };
}

export async function computeAggregatedStats(): Promise<AggregatedStats> {
  const matches = await listMatches();
  return aggregate(matches);
}

/** Borra todo el historial. Util para "reiniciar estadísticas" y para tests. */
export async function clearAllMatches(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
  } catch (err) {
    console.error('No se pudo borrar el historial de IndexedDB', err);
  }
}
