// Test de integracion end-to-end: servidor Socket.IO real + clientes reales,
// jugando la fase de eleccion (vocales/numeros grandes), una ronda de letras y una de
// cifras completas. Verifica que el motor (game-engine) esta realmente conectado al
// servidor (R2.1, R3.1, R5.2-R5.4).

import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  findLongestValidWord,
  solveNumbers,
  stepsToSubmissionString,
  type ChoosingStartPayload,
  type ClientToServerEvents,
  type ErrorPayload,
  type RoomJoinedPayload,
  type RoundRevealPayload,
  type RoundStartPayload,
  type ServerToClientEvents,
} from '@duelo-lexico/game-engine';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initDictionary } from '../src/dictionary.js';
import { registerRoomHandlers, type AppServer, type AppSocket } from '../src/rooms/index.js';

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let io: AppServer;
let baseUrl: string;

beforeAll(async () => {
  initDictionary();
  httpServer = createServer();
  io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket: AppSocket) => registerRoomHandlers(io, socket));
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as AddressInfo).port;
  baseUrl = `http://localhost:${port}`;
});

afterAll(() => {
  io.close();
  httpServer.close();
});

function connectClient(): Promise<TestClient> {
  return new Promise((resolve) => {
    const socket: TestClient = ioClient(baseUrl, { transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
  });
}

function waitFor<T>(socket: TestClient, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, resolve as (...args: unknown[]) => void);
  });
}

async function createAndJoinRoom(): Promise<{
  alice: TestClient;
  bob: TestClient;
  aliceId: string;
  bobId: string;
  aliceSessionToken: string;
  bobSessionToken: string;
  roomId: string;
  firstChoosing: ChoosingStartPayload;
}> {
  const alice = await connectClient();
  const bob = await connectClient();

  const created = await new Promise<RoomJoinedPayload>((resolve) => alice.emit('room:create', resolve));
  const aliceChoosingPromise = waitFor<ChoosingStartPayload>(alice, 'round:choosing');
  const bobChoosingPromise = waitFor<ChoosingStartPayload>(bob, 'round:choosing');

  const joined = await new Promise<RoomJoinedPayload | ErrorPayload>((resolve) => {
    bob.emit('room:join', { roomId: created.roomId }, resolve);
  });
  if ('error' in joined) throw new Error(`join fallo: ${joined.error}`);

  const [aliceChoosing, bobChoosing] = await Promise.all([aliceChoosingPromise, bobChoosingPromise]);
  expect(aliceChoosing).toEqual(bobChoosing);

  return {
    alice,
    bob,
    aliceId: created.playerId,
    bobId: joined.playerId,
    aliceSessionToken: created.sessionToken,
    bobSessionToken: joined.sessionToken,
    roomId: created.roomId,
    firstChoosing: aliceChoosing,
  };
}

describe('flujo de partida online', () => {
  it('dos jugadores eligen vocales/numeros grandes por turnos, juegan letras y cifras, y reciben puntuacion correcta', async () => {
    const { alice, bob, aliceId, bobId, firstChoosing } = await createAndJoinRoom();

    // --- Ronda 0: letras. Le toca elegir al primer jugador (quien creo la sala). ---
    expect(firstChoosing.kind).toBe('letters');
    expect(firstChoosing.chooserPlayerId).toBe(aliceId);
    expect(firstChoosing).toMatchObject({ roundIndex: 0, min: 3, max: 6 });

    const aliceRoundStartPromise = waitFor<RoundStartPayload>(alice, 'round:start');
    const bobRoundStartPromise = waitFor<RoundStartPayload>(bob, 'round:start');
    alice.emit('choice:submit', { roundIndex: 0, count: 5 });

    const [aliceRound0, bobRound0] = await Promise.all([aliceRoundStartPromise, bobRoundStartPromise]);
    expect(aliceRound0.kind).toBe('letters');
    expect(aliceRound0).toEqual(bobRound0);
    expect(aliceRound0.letters!.vowels).toHaveLength(5); // lo que eligio alice
    expect(aliceRound0.letters!.vowels.length + aliceRound0.letters!.consonants.length).toBe(10);

    const allLetters = [...aliceRound0.letters!.vowels, ...aliceRound0.letters!.consonants];
    const bestWord = findLongestValidWord(allLetters);
    expect(bestWord).not.toBeNull();

    const aliceReveal0Promise = waitFor<RoundRevealPayload>(alice, 'round:reveal');
    const bobChoosing1Promise = waitFor<ChoosingStartPayload>(bob, 'round:choosing');

    // alice manda la mejor palabra real posible; bob "pasa" (string vacio) para que el
    // servidor revele en cuanto respondan los dos, sin esperar los 30s reales del reloj.
    alice.emit('answer:submit', { roundIndex: 0, answer: bestWord! });
    bob.emit('answer:submit', { roundIndex: 0, answer: '' });

    const reveal0 = await aliceReveal0Promise;
    expect(reveal0.kind).toBe('letters');
    expect(reveal0.answers[aliceId]).toBe(bestWord);
    expect(reveal0.answers[bobId]).toBe(''); // bob "paso" con string vacio
    expect(reveal0.roundScores[aliceId]).toBe(bestWord!.length);
    expect(reveal0.roundScores[bobId]).toBe(0);
    expect(reveal0.totals[aliceId]).toBe(bestWord!.length);

    // --- Ronda 1: cifras. Le toca elegir al segundo jugador. ---
    const choosing1 = await bobChoosing1Promise;
    expect(choosing1.kind).toBe('numbers');
    expect(choosing1.chooserPlayerId).toBe(bobId);
    expect(choosing1).toMatchObject({ roundIndex: 1, min: 0, max: 4 });

    const aliceRoundStartPromise2 = waitFor<RoundStartPayload>(alice, 'round:start');
    const bobRoundStartPromise2 = waitFor<RoundStartPayload>(bob, 'round:start');
    bob.emit('choice:submit', { roundIndex: 1, count: 3 });

    const [round1] = await Promise.all([aliceRoundStartPromise2, bobRoundStartPromise2]);
    expect(round1.kind).toBe('numbers');
    expect(round1.numbers).toHaveLength(6);

    const solved = solveNumbers(round1.numbers!, round1.target!);

    const bobReveal1Promise = waitFor<RoundRevealPayload>(bob, 'round:reveal');
    bob.emit('answer:submit', {
      roundIndex: 1,
      answer: stepsToSubmissionString(solved.steps, solved.closestValue),
    });
    alice.emit('answer:submit', { roundIndex: 1, answer: '' });

    const reveal1 = await bobReveal1Promise;
    expect(reveal1.kind).toBe('numbers');
    expect(reveal1.roundScores[bobId]).toBeGreaterThan(0);
    expect(reveal1.roundScores[bobId]).toBe(solved.exact ? 10 : 7);
    // el marcador acumulado de bob ahora incluye los puntos de esta ronda
    expect(reveal1.totals[bobId]).toBe(reveal1.roundScores[bobId]);

    alice.close();
    bob.close();
  }, 15_000);

  it('ignora la eleccion de quien no le toca elegir', async () => {
    const { alice, bob, aliceId, bobId, firstChoosing } = await createAndJoinRoom();
    expect(firstChoosing.chooserPlayerId).toBe(aliceId);

    const roundStartRace = waitFor<RoundStartPayload>(alice, 'round:start');

    // bob no es el elegido en la ronda 0; su eleccion debe ser ignorada.
    bob.emit('choice:submit', { roundIndex: 0, count: 4 });
    const stillWaiting = await Promise.race([
      roundStartRace.then(() => 'started' as const),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 300)),
    ]);
    expect(stillWaiting).toBe('timeout');

    // alice si puede resolverla.
    alice.emit('choice:submit', { roundIndex: 0, count: 4 });
    const round0 = await roundStartRace;
    expect(round0.letters!.vowels).toHaveLength(4);

    expect(bobId).toBeTruthy(); // referenciado para que no quede como variable sin usar
    alice.close();
    bob.close();
  });

  it('aplica un valor por defecto si nadie elige a tiempo', async () => {
    const { alice, bob, firstChoosing } = await createAndJoinRoom();
    expect(firstChoosing.kind).toBe('letters');

    const round0 = await waitFor<RoundStartPayload>(alice, 'round:start');
    // DEFAULT_VOWEL_COUNT en apps/server/src/match/index.ts
    expect(round0.letters!.vowels).toHaveLength(4);

    alice.close();
    bob.close();
  }, 15_000);

  it('rechaza unirse a una sala inexistente', async () => {
    const client = await connectClient();
    const result = await new Promise<RoomJoinedPayload | ErrorPayload>((resolve) => {
      client.emit('room:join', { roomId: 'NOEXISTE' }, resolve);
    });
    expect(result).toEqual({ error: 'room-not-found' });
    client.close();
  });
});

describe('reconexión (R5.3)', () => {
  it('reenvía el round:choosing vigente a quien se reconecta durante la fase de elección', async () => {
    const { alice, bob, roomId, bobSessionToken, firstChoosing } = await createAndJoinRoom();

    const aliceDisconnectedPromise = waitFor<{ playerId: string; graceMs: number }>(alice, 'player:disconnected');
    bob.disconnect();
    const disconnected = await aliceDisconnectedPromise;
    expect(disconnected.graceMs).toBeGreaterThan(0);

    const aliceReconnectedPromise = waitFor<{ playerId: string }>(alice, 'player:reconnected');
    const bobNew = await connectClient();
    const rejoinAck = await new Promise<RoomJoinedPayload | ErrorPayload>((resolve) => {
      bobNew.emit('room:join', { roomId, sessionToken: bobSessionToken }, resolve);
    });
    if ('error' in rejoinAck) throw new Error(`reconexion fallo: ${rejoinAck.error}`);

    const resent = await waitFor<ChoosingStartPayload>(bobNew, 'round:choosing');
    expect(resent).toEqual(firstChoosing);
    await aliceReconnectedPromise;

    // la partida sigue funcionando con normalidad tras la reconexion.
    const aliceRoundStartPromise = waitFor<RoundStartPayload>(alice, 'round:start');
    alice.emit('choice:submit', { roundIndex: 0, count: 4 });
    const round0 = await aliceRoundStartPromise;
    expect(round0.letters!.vowels).toHaveLength(4);

    alice.close();
    bobNew.close();
  });

  it('reenvía el round:start vigente (mismas letras, mismo deadline) a quien se reconecta a mitad de ronda', async () => {
    const { alice, bob, roomId, bobId, bobSessionToken, firstChoosing } = await createAndJoinRoom();

    const aliceRoundStartPromise = waitFor<RoundStartPayload>(alice, 'round:start');
    const bobRoundStartPromise = waitFor<RoundStartPayload>(bob, 'round:start');
    alice.emit('choice:submit', { roundIndex: firstChoosing.roundIndex, count: 4 });
    const [round0] = await Promise.all([aliceRoundStartPromise, bobRoundStartPromise]);

    bob.disconnect();
    await waitFor(alice, 'player:disconnected');

    const bobNew = await connectClient();
    const rejoinAck = await new Promise<RoomJoinedPayload | ErrorPayload>((resolve) => {
      bobNew.emit('room:join', { roomId, sessionToken: bobSessionToken }, resolve);
    });
    if ('error' in rejoinAck) throw new Error(`reconexion fallo: ${rejoinAck.error}`);

    const resent = await waitFor<RoundStartPayload>(bobNew, 'round:start');
    expect(resent.kind).toBe('letters');
    expect(resent.letters).toEqual(round0.letters); // las mismas letras, no un sorteo nuevo
    expect(resent.deadline).toBeLessThanOrEqual(round0.deadline); // el reloj no se reinicia

    // bob (reconectado) puede seguir jugando la ronda con normalidad.
    const bobReveal0Promise = waitFor<RoundRevealPayload>(bobNew, 'round:reveal');
    bobNew.emit('answer:submit', { roundIndex: 0, answer: '' });
    alice.emit('answer:submit', { roundIndex: 0, answer: '' });
    const reveal0 = await bobReveal0Promise;
    expect(reveal0.answers[bobId]).toBe('');

    alice.close();
    bobNew.close();
  });

  it('rechaza reconectar con un sessionToken inválido', async () => {
    const { alice, bob, roomId } = await createAndJoinRoom();

    const client = await connectClient();
    const result = await new Promise<RoomJoinedPayload | ErrorPayload>((resolve) => {
      client.emit('room:join', { roomId, sessionToken: 'token-que-no-existe' }, resolve);
    });
    expect(result).toEqual({ error: 'invalid-session' });

    client.close();
    alice.close();
    bob.close();
  });
});
