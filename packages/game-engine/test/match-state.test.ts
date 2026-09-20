import { describe, expect, it } from 'vitest';
import {
  advanceMatchState,
  applyRoundScores,
  createDefaultMatchConfig,
  createInitialMatchState,
} from '../src/match-state.js';

describe('createDefaultMatchConfig', () => {
  it('genera 10 rondas alternando letras y cifras, empezando por letras', () => {
    const config = createDefaultMatchConfig();
    expect(config.rounds).toHaveLength(10);
    expect(config.rounds[0]).toEqual({ kind: 'letters', index: 0 });
    expect(config.rounds[1]).toEqual({ kind: 'numbers', index: 0 });
    expect(config.rounds.filter((r) => r.kind === 'letters')).toHaveLength(5);
    expect(config.rounds.filter((r) => r.kind === 'numbers')).toHaveLength(5);
  });

  it('respeta cantidades personalizadas aunque no coincidan entre si', () => {
    const config = createDefaultMatchConfig(2, 4);
    expect(config.rounds.filter((r) => r.kind === 'letters')).toHaveLength(2);
    expect(config.rounds.filter((r) => r.kind === 'numbers')).toHaveLength(4);
    expect(config.rounds).toHaveLength(6);
  });
});

describe('ciclo de vida de la partida', () => {
  it('avanza choosing -> answering -> reveal -> siguiente ronda -> ... -> finished', () => {
    const config = createDefaultMatchConfig(1, 1); // 2 rondas
    let state = createInitialMatchState(config, ['alice', 'bob']);
    expect(state.phase).toBe('choosing');
    expect(state.currentRoundIndex).toBe(0);

    state = advanceMatchState(state); // answering
    expect(state.phase).toBe('answering');

    state = advanceMatchState(state); // reveal
    expect(state.phase).toBe('reveal');

    state = advanceMatchState(state); // siguiente ronda: choosing, index 1
    expect(state.phase).toBe('choosing');
    expect(state.currentRoundIndex).toBe(1);

    state = advanceMatchState(state); // answering
    state = advanceMatchState(state); // reveal
    state = advanceMatchState(state); // finished (no mas rondas)
    expect(state.phase).toBe('finished');

    const stateAfterFinished = advanceMatchState(state);
    expect(stateAfterFinished).toEqual(state); // finished es un estado terminal
  });

  it('acumula puntuacion ronda a ronda', () => {
    const config = createDefaultMatchConfig(1, 0);
    let state = createInitialMatchState(config, ['alice', 'bob']);
    state = applyRoundScores(state, { alice: 9, bob: 0 });
    state = applyRoundScores(state, { alice: 0, bob: 10 });
    expect(state.scores).toEqual({ alice: 9, bob: 10 });
  });
});
