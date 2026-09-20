import { describe, expect, it } from 'vitest';
import {
  APPROX_NUMBER_POINTS,
  EXACT_NUMBER_POINTS,
  MAX_APPROX_DISTANCE,
  scoreLettersRound,
  scoreNumbersRound,
  scoreNumbersSolo,
} from '../src/scoring.js';

describe('scoreLettersRound', () => {
  it('puntua con el numero de letras de la palabra valida mas larga', () => {
    const scores = scoreLettersRound({ alice: 'ordenador', bob: 'mesa' });
    expect(scores).toEqual({ alice: 9, bob: 0 });
  });

  it('reparte puntos a ambos en caso de empate (ambos reciben el maximo)', () => {
    const scores = scoreLettersRound({ alice: 'casas', bob: 'mesas' });
    expect(scores).toEqual({ alice: 5, bob: 5 });
  });

  it('nadie puntua si ningun jugador dio una palabra valida', () => {
    const scores = scoreLettersRound({ alice: null, bob: null });
    expect(scores).toEqual({ alice: 0, bob: 0 });
  });
});

describe('scoreNumbersRound', () => {
  it('otorga EXACT_NUMBER_POINTS al resultado exacto', () => {
    const scores = scoreNumbersRound({ alice: 400, bob: 398 }, 400);
    expect(scores).toEqual({ alice: EXACT_NUMBER_POINTS, bob: 0 });
  });

  it('otorga APPROX_NUMBER_POINTS a la mejor aproximacion cuando nadie acierta', () => {
    const scores = scoreNumbersRound({ alice: 398, bob: 405 }, 400);
    expect(scores).toEqual({ alice: APPROX_NUMBER_POINTS, bob: 0 });
  });

  it('reparte puntos a ambos si empatan en la misma aproximacion', () => {
    const scores = scoreNumbersRound({ alice: 398, bob: 402 }, 400);
    expect(scores).toEqual({ alice: APPROX_NUMBER_POINTS, bob: APPROX_NUMBER_POINTS });
  });

  it('nadie puntua si ningun jugador dio una respuesta valida', () => {
    const scores = scoreNumbersRound({ alice: null, bob: null }, 400);
    expect(scores).toEqual({ alice: 0, bob: 0 });
  });
});

describe('scoreNumbersSolo', () => {
  it('otorga EXACT_NUMBER_POINTS si el resultado es exacto', () => {
    expect(scoreNumbersSolo(400, 400)).toBe(EXACT_NUMBER_POINTS);
  });

  it('otorga APPROX_NUMBER_POINTS dentro del margen MAX_APPROX_DISTANCE', () => {
    expect(scoreNumbersSolo(400 - MAX_APPROX_DISTANCE, 400)).toBe(APPROX_NUMBER_POINTS);
    expect(scoreNumbersSolo(400 + MAX_APPROX_DISTANCE, 400)).toBe(APPROX_NUMBER_POINTS);
  });

  it('no otorga puntos si esta mas lejos que MAX_APPROX_DISTANCE (no hay rival con quien comparar)', () => {
    expect(scoreNumbersSolo(400 - MAX_APPROX_DISTANCE - 1, 400)).toBe(0);
    expect(scoreNumbersSolo(7, 207)).toBe(0); // caso real: dos pasos sin encadenar (ver AGENTS.md #9)
  });

  it('no puntua si no hubo respuesta valida', () => {
    expect(scoreNumbersSolo(null, 400)).toBe(0);
  });
});
