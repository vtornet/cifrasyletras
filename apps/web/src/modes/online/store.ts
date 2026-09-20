// Cliente del modo Online (2 jugadores) - R2.1, R3.1, R5.1-R5.4
// El servidor es la unica fuente de verdad (bombo, objetivo, cronometro, validacion,
// quien elige vocales/numeros grandes); este store solo refleja los eventos que llegan
// por Socket.IO (ver AGENTS.md #10).

import type {
  ChoosingStartPayload,
  ClientToServerEvents,
  MatchEndPayload,
  PlayerInfo,
  RoomJoinedPayload,
  RoundRevealPayload,
  RoundStartPayload,
  ServerToClientEvents,
} from '@duelo-lexico/game-engine';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';

const SERVER_URL: string = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'http://localhost:3001';
const SESSION_KEY = 'duelo-lexico:online-session';

export type OnlinePhase =
  | 'disconnected'
  | 'connecting'
  | 'waiting-for-opponent'
  | 'choosing'
  | 'answering'
  | 'reveal'
  | 'finished';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface OnlineMatchStore {
  socket: AppSocket | null;
  phase: OnlinePhase;
  roomId: string | null;
  playerId: string | null;
  players: PlayerInfo[];
  choosing: ChoosingStartPayload | null;
  roundStart: RoundStartPayload | null;
  reveal: RoundRevealPayload | null;
  matchEnd: MatchEndPayload | null;
  errorMessage: string | null;

  createRoom: () => void;
  joinRoom: (roomId: string) => void;
  restoreSession: () => boolean;
  submitChoice: (count: number) => void;
  submitAnswer: (answer: string) => void;
  leaveRoom: () => void;
}

interface PersistedSession {
  roomId: string;
  sessionToken: string;
}

function persistSession(res: RoomJoinedPayload): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId: res.roomId, sessionToken: res.sessionToken }));
  } catch {
    // localStorage puede no estar disponible (modo privado); no es critico para jugar.
  }
}

function readPersistedSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // no critico
  }
}

/** R5.3/#10: hay una partida guardada de una visita anterior que podria retomarse. */
export function hasPersistedSession(): boolean {
  return readPersistedSession() !== null;
}

export const useOnlineMatchStore = create<OnlineMatchStore>((set, get) => {
  function ensureSocket(): AppSocket {
    const existing = get().socket;
    if (existing) return existing;

    const socket: AppSocket = io(SERVER_URL);

    // Socket.IO reconecta el socket solo tras un corte de red, pero el servidor lo ve
    // como una conexion nueva (nuevo socket.id, sin roomId/playerId asociados): hay que
    // volver a mandar room:join con el sessionToken guardado para retomar la sala. Si
    // roomId sigue null es la primerísima conexion (crear/unirse aun no se ha llamado),
    // no una reconexion, asi que no hay nada que retomar todavia.
    socket.on('connect', () => {
      const { roomId } = get();
      if (!roomId) return;
      const persisted = readPersistedSession();
      if (!persisted || persisted.roomId !== roomId) return;

      socket.emit('room:join', { roomId, sessionToken: persisted.sessionToken }, (res) => {
        if ('error' in res) {
          clearSession();
          set({
            errorMessage: 'No se pudo recuperar la partida. Puede que ya haya terminado.',
            roomId: null,
            phase: 'disconnected',
          });
          return;
        }
        set((state) => ({
          playerId: res.playerId,
          players: res.players,
          errorMessage: null,
          // Si aun no llega ningun evento de ronda (p. ej. venimos de 'connecting' tras
          // recargar la pagina), al menos refleja que la sala existe y espera al rival.
          phase: state.phase === 'connecting' ? 'waiting-for-opponent' : state.phase,
        }));
      });
    });

    socket.on('room:players-updated', ({ players }) => {
      set((state) => ({ players, phase: players.length < 2 ? 'waiting-for-opponent' : state.phase }));
    });
    socket.on('round:choosing', (payload) => {
      set({ choosing: payload, roundStart: null, reveal: null, phase: 'choosing' });
    });
    socket.on('round:start', (payload) => {
      set({ roundStart: payload, choosing: null, reveal: null, phase: 'answering' });
    });
    socket.on('round:reveal', (payload) => {
      set({ reveal: payload, phase: 'reveal' });
    });
    socket.on('match:end', (payload) => {
      set({ matchEnd: payload, phase: 'finished' });
    });
    socket.on('player:disconnected', () => {
      set({ errorMessage: 'Tu rival se ha desconectado. Esperando a que vuelva…' });
    });
    socket.on('player:reconnected', () => {
      set({ errorMessage: null });
    });
    socket.on('disconnect', () => {
      // Si roomId ya es null es que fue leaveRoom() quien desconecto a proposito.
      if (get().roomId) set({ errorMessage: 'Conexión perdida. Reconectando…' });
    });

    set({ socket });
    return socket;
  }

  return {
    socket: null,
    phase: 'disconnected',
    roomId: null,
    playerId: null,
    players: [],
    choosing: null,
    roundStart: null,
    reveal: null,
    matchEnd: null,
    errorMessage: null,

    createRoom: () => {
      const socket = ensureSocket();
      socket.emit('room:create', (res) => {
        if ('error' in res) {
          set({ errorMessage: res.error });
          return;
        }
        persistSession(res);
        set({
          roomId: res.roomId,
          playerId: res.playerId,
          players: res.players,
          phase: 'waiting-for-opponent',
          errorMessage: null,
        });
      });
    },

    joinRoom: (roomId) => {
      const socket = ensureSocket();
      socket.emit('room:join', { roomId }, (res) => {
        if ('error' in res) {
          set({ errorMessage: res.error });
          return;
        }
        persistSession(res);
        set({
          roomId: res.roomId,
          playerId: res.playerId,
          players: res.players,
          // Si ya hay 2 jugadores, el servidor esta a punto de mandar 'round:choosing';
          // ese listener actualiza la fase real en cuanto llegue.
          phase: 'waiting-for-opponent',
          errorMessage: null,
        });
      });
    },

    // Recupera una partida tras recargar la pagina entera (#10 - antes solo se reconectaba
    // el socket con la pestana ya abierta). El propio socket, al conectar, ve que `roomId`
    // ya esta puesto y reenvia 'room:join' con el sessionToken guardado (ver `ensureSocket`).
    restoreSession: () => {
      if (get().socket) return true;
      const persisted = readPersistedSession();
      if (!persisted) return false;
      set({ roomId: persisted.roomId, phase: 'connecting', errorMessage: null });
      ensureSocket();
      return true;
    },

    submitChoice: (count) => {
      const { socket, choosing } = get();
      if (!socket || !choosing) return;
      socket.emit('choice:submit', { roundIndex: choosing.roundIndex, count });
    },

    submitAnswer: (answer) => {
      const { socket, roundStart } = get();
      if (!socket || !roundStart) return;
      socket.emit('answer:submit', { roundIndex: roundStart.roundIndex, answer });
    },

    leaveRoom: () => {
      get().socket?.disconnect();
      clearSession();
      set({
        socket: null,
        phase: 'disconnected',
        roomId: null,
        playerId: null,
        players: [],
        choosing: null,
        roundStart: null,
        reveal: null,
        matchEnd: null,
        errorMessage: null,
      });
    },
  };
});
