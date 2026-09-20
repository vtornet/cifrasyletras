import { beforeEach, describe, expect, it } from 'vitest';
import type { RoundHistoryEntry } from './store';
import { clearAllMatches, computeAggregatedStats, listMatches, saveMatch, type StoredMatch } from './stats';

function makeMatch(overrides: Partial<StoredMatch> & { rounds: RoundHistoryEntry[] }): StoredMatch {
  return {
    id: crypto.randomUUID(),
    playedAt: Date.now(),
    totalScore: 0,
    ...overrides,
  };
}

describe('estadísticas del modo Práctica (IndexedDB)', () => {
  beforeEach(async () => {
    await clearAllMatches();
  });

  it('lista vacía cuando no se ha guardado ninguna partida', async () => {
    expect(await listMatches()).toEqual([]);
    expect(await computeAggregatedStats()).toEqual({
      matchesPlayed: 0,
      bestScore: 0,
      averageScore: 0,
      bestWord: null,
      bestNumbersExactCount: 0,
    });
  });

  it('guarda una partida y la recupera', async () => {
    const match = makeMatch({
      totalScore: 15,
      rounds: [{ kind: 'letters', answer: 'CASAS', points: 5, bestWord: 'casas' }],
    });
    await saveMatch(match);

    const matches = await listMatches();
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(match);
  });

  it('devuelve las partidas más recientes primero', async () => {
    const older = makeMatch({ playedAt: 1000, totalScore: 5, rounds: [] });
    const newer = makeMatch({ playedAt: 2000, totalScore: 8, rounds: [] });
    await saveMatch(older);
    await saveMatch(newer);

    const matches = await listMatches();
    expect(matches.map((m) => m.id)).toEqual([newer.id, older.id]);
  });

  it('calcula agregados: mejor puntuación, media, mejor palabra y cifras exactas', async () => {
    await saveMatch(
      makeMatch({
        totalScore: 20,
        rounds: [
          { kind: 'letters', answer: 'ORDENADOR', points: 9, bestWord: 'ordenador' },
          { kind: 'numbers', answer: '75+25', points: 10, target: 100 },
        ],
      }),
    );
    await saveMatch(
      makeMatch({
        totalScore: 10,
        rounds: [
          { kind: 'letters', answer: 'CASA', points: 4, bestWord: 'casa' },
          { kind: 'numbers', answer: '10+5', points: 7, target: 20 },
        ],
      }),
    );

    const stats = await computeAggregatedStats();
    expect(stats.matchesPlayed).toBe(2);
    expect(stats.bestScore).toBe(20);
    expect(stats.averageScore).toBe(15);
    expect(stats.bestWord).toBe('ORDENADOR');
    expect(stats.bestNumbersExactCount).toBe(1); // solo la primera partida acerto una cifra exacta (10 pts)
  });

  it('clearAllMatches borra el historial', async () => {
    await saveMatch(makeMatch({ totalScore: 5, rounds: [] }));
    expect(await listMatches()).toHaveLength(1);

    await clearAllMatches();
    expect(await listMatches()).toEqual([]);
  });
});
