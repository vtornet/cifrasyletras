// Protocolo del modo Online (2 jugadores) - AGENTS.md #10, R5.1-R5.4
// Tipos compartidos entre apps/server y apps/web para los eventos de Socket.IO.
// El servidor es la unica fuente de verdad; el cliente solo refleja estos payloads.

import type { LetterBagState } from './letters/bag.js';
import type { RoundKind } from './match-state.js';
import type { ResolvedStep } from './numbers/steps.js';

export const ROUND_DURATION_MS: Record<RoundKind, number> = {
  letters: 30_000,
  numbers: 40_000,
};

export const RECONNECT_GRACE_MS = 30_000;
export const ROOM_CODE_LENGTH = 6;
/** Tiempo para que el jugador en turno elija vocales/numeros grandes antes de aplicar un valor por defecto. */
export const CHOICE_DURATION_MS = 10_000;

/** Eventos que el cliente emite hacia el servidor. */
export interface ClientToServerEvents {
  'room:create': (ack: (res: RoomJoinedPayload | ErrorPayload) => void) => void;
  'room:join': (
    payload: { roomId: string; sessionToken?: string },
    ack: (res: RoomJoinedPayload | ErrorPayload) => void,
  ) => void;
  'choice:submit': (payload: ChoiceSubmitPayload) => void;
  'answer:submit': (payload: AnswerSubmitPayload) => void;
}

/** Eventos que el servidor emite hacia los clientes de una sala. */
export interface ServerToClientEvents {
  'room:players-updated': (payload: { players: PlayerInfo[] }) => void;
  'round:choosing': (payload: ChoosingStartPayload) => void;
  'round:start': (payload: RoundStartPayload) => void;
  'round:reveal': (payload: RoundRevealPayload) => void;
  'match:end': (payload: MatchEndPayload) => void;
  'player:disconnected': (payload: { playerId: string; graceMs: number }) => void;
  'player:reconnected': (payload: { playerId: string }) => void;
}

export interface PlayerInfo {
  playerId: string;
  connected: boolean;
}

export interface RoomJoinedPayload {
  roomId: string;
  playerId: string;
  sessionToken: string;
  players: PlayerInfo[];
}

export interface ErrorPayload {
  error: 'room-not-found' | 'room-full' | 'invalid-session';
}

/** El servidor pide al jugador chooserPlayerId que elija un numero entre min y max. */
export interface ChoosingStartPayload {
  roundIndex: number;
  kind: RoundKind;
  chooserPlayerId: string;
  min: number;
  max: number;
  /** Timestamp absoluto: si no elige a tiempo, el servidor aplica un valor por defecto. */
  deadline: number;
}

export interface ChoiceSubmitPayload {
  roundIndex: number;
  count: number;
}

export interface RoundStartPayload {
  roundIndex: number;
  kind: RoundKind;
  /** Timestamp absoluto (epoch ms) en el que termina el tiempo de respuesta. */
  deadline: number;
  letters?: LetterBagState;
  numbers?: number[];
  target?: number;
}

export interface AnswerSubmitPayload {
  roundIndex: number;
  /** Palabra (letras) o cadena de pasos "24*10;240-30" en texto (cifras, ver numbers/steps.ts). */
  answer: string;
}

export interface RoundRevealPayload {
  roundIndex: number;
  kind: RoundKind;
  answers: Record<string, string | null>;
  /** Puntos ganados en esta ronda por jugador. */
  roundScores: Record<string, number>;
  /** Marcador acumulado tras esta ronda. */
  totals: Record<string, number>;
  solution: { word: string | null } | { steps: ResolvedStep[]; value: number };
}

export interface MatchEndPayload {
  totals: Record<string, number>;
  /** null si hay empate. */
  winnerId: string | null;
}
