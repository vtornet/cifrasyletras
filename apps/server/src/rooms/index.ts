// Ciclo de vida de sala (crear, unirse por codigo, reconexion) - AGENTS.md #10, R5.1-R5.4

import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import {
  createDefaultMatchConfig,
  createInitialMatchState,
  RECONNECT_GRACE_MS,
  ROOM_CODE_LENGTH,
  type AnswerSubmitPayload,
  type ChoiceSubmitPayload,
  type ClientToServerEvents,
  type ErrorPayload,
  type MatchState,
  type PlayerInfo,
  type RoundKind,
  type ServerToClientEvents,
} from '@duelo-lexico/game-engine';
import { handleAnswerSubmit, handleChoiceSubmit, sendCurrentRoundState, startNextRound } from '../match/index.js';

// Sin caracteres ambiguos (O/0, I/1) para que el codigo sea facil de dictar/teclear.
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface SocketData {
  roomId?: string;
  playerId?: string;
}

export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export interface Player {
  playerId: string;
  sessionToken: string;
  socketId: string | null;
  connected: boolean;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
}

export interface PendingChoice {
  roundIndex: number;
  chooserPlayerId: string;
  kind: RoundKind;
}

export interface Room {
  roomId: string;
  players: Map<string, Player>;
  matchState: MatchState;
  currentRoundDeadline: number | null;
  currentRoundAnswers: Map<string, string>;
  revealTimer: ReturnType<typeof setTimeout> | null;
  pendingChoice: PendingChoice | null;
  choiceDeadline: number | null;
  choiceTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)],
    ).join('');
  } while (rooms.has(code));
  return code;
}

function toPlayerInfoList(room: Room): PlayerInfo[] {
  return Array.from(room.players.values()).map((p) => ({ playerId: p.playerId, connected: p.connected }));
}

export function registerRoomHandlers(io: AppServer, socket: AppSocket): void {
  socket.on('room:create', (ack) => {
    const roomId = generateRoomCode();
    const playerId = randomUUID();
    const sessionToken = randomUUID();

    const config = createDefaultMatchConfig();
    const matchState = createInitialMatchState(config, [playerId]);

    const room: Room = {
      roomId,
      players: new Map([
        [playerId, { playerId, sessionToken, socketId: socket.id, connected: true, disconnectTimer: null }],
      ]),
      matchState,
      currentRoundDeadline: null,
      currentRoundAnswers: new Map(),
      revealTimer: null,
      pendingChoice: null,
      choiceDeadline: null,
      choiceTimer: null,
    };
    rooms.set(roomId, room);

    socket.data.roomId = roomId;
    socket.data.playerId = playerId;
    void socket.join(roomId);

    ack({ roomId, playerId, sessionToken, players: toPlayerInfoList(room) });
  });

  socket.on('room:join', (payload, ack) => {
    const room = rooms.get(payload.roomId);
    if (!room) {
      ack({ error: 'room-not-found' } satisfies ErrorPayload);
      return;
    }

    if (payload.sessionToken) {
      const existing = Array.from(room.players.values()).find((p) => p.sessionToken === payload.sessionToken);
      if (!existing) {
        ack({ error: 'invalid-session' } satisfies ErrorPayload);
        return;
      }
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
        existing.disconnectTimer = null;
      }
      existing.connected = true;
      existing.socketId = socket.id;
      socket.data.roomId = room.roomId;
      socket.data.playerId = existing.playerId;
      void socket.join(room.roomId);

      ack({
        roomId: room.roomId,
        playerId: existing.playerId,
        sessionToken: existing.sessionToken,
        players: toPlayerInfoList(room),
      });
      io.to(room.roomId).emit('room:players-updated', { players: toPlayerInfoList(room) });
      io.to(room.roomId).emit('player:reconnected', { playerId: existing.playerId });
      // Al reconectar, el jugador se perdio el round:choosing / round:start original:
      // se le reenvia el estado actual de la ronda (si sigue vigente) solo a el.
      sendCurrentRoundState(socket, room);
      return;
    }

    if (room.players.size >= 2) {
      ack({ error: 'room-full' } satisfies ErrorPayload);
      return;
    }

    const playerId = randomUUID();
    const sessionToken = randomUUID();
    room.players.set(playerId, {
      playerId,
      sessionToken,
      socketId: socket.id,
      connected: true,
      disconnectTimer: null,
    });
    room.matchState.scores[playerId] = 0;

    socket.data.roomId = room.roomId;
    socket.data.playerId = playerId;
    void socket.join(room.roomId);

    ack({ roomId: room.roomId, playerId, sessionToken, players: toPlayerInfoList(room) });
    io.to(room.roomId).emit('room:players-updated', { players: toPlayerInfoList(room) });

    if (room.players.size === 2) {
      startNextRound(io, room);
    }
  });

  socket.on('choice:submit', (payload: ChoiceSubmitPayload) => {
    const { roomId, playerId } = socket.data;
    if (!roomId || !playerId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    handleChoiceSubmit(io, room, playerId, payload);
  });

  socket.on('answer:submit', (payload: AnswerSubmitPayload) => {
    const { roomId, playerId } = socket.data;
    if (!roomId || !playerId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    handleAnswerSubmit(io, room, playerId, payload);
  });

  socket.on('disconnect', () => {
    const { roomId, playerId } = socket.data;
    if (!roomId || !playerId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;

    player.connected = false;
    player.socketId = null;
    io.to(roomId).emit('player:disconnected', { playerId, graceMs: RECONNECT_GRACE_MS });

    player.disconnectTimer = setTimeout(() => {
      const stillRoom = rooms.get(roomId);
      if (stillRoom && !stillRoom.players.get(playerId)?.connected) {
        rooms.delete(roomId);
      }
    }, RECONNECT_GRACE_MS);
  });
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}
