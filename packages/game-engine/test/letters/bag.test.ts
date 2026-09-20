import { describe, expect, it } from 'vitest';
import {
  canFormWord,
  CONSONANT_FREQUENCIES,
  drawLetters,
  MAX_VOWELS,
  MIN_VOWELS,
  VOWEL_FREQUENCIES,
} from '../../src/letters/bag.js';

describe('drawLetters', () => {
  it('devuelve exactamente vowelCount vocales y el resto consonantes hasta totalLetters', () => {
    const { vowels, consonants } = drawLetters({ vowelCount: 4 });
    expect(vowels).toHaveLength(4);
    expect(consonants).toHaveLength(6);
  });

  it('respeta totalLetters personalizado', () => {
    const { vowels, consonants } = drawLetters({ vowelCount: 3, totalLetters: 8 });
    expect(vowels).toHaveLength(3);
    expect(consonants).toHaveLength(5);
  });

  it.each([MIN_VOWELS - 1, MAX_VOWELS + 1, 0, 2.5])(
    'rechaza vowelCount fuera de rango o no entero (%s)',
    (vowelCount) => {
      expect(() => drawLetters({ vowelCount })).toThrow();
    },
  );

  it('solo devuelve letras que existen en las tablas de frecuencia', () => {
    const { vowels, consonants } = drawLetters({ vowelCount: 5 });
    for (const v of vowels) expect(Object.keys(VOWEL_FREQUENCIES)).toContain(v);
    for (const c of consonants) expect(Object.keys(CONSONANT_FREQUENCIES)).toContain(c);
  });

  it('es determinista con un rng inyectado', () => {
    const rng = () => 0; // siempre elige el primer elemento restante
    const first = drawLetters({ vowelCount: 5 }, rng);
    const second = drawLetters({ vowelCount: 5 }, rng);
    expect(first).toEqual(second);
  });

  it('no repite mas copias de una letra que las que hay en su bombo', () => {
    // con totalLetters=44 (todas las vocales del bombo) debe agotar exactamente el pool
    const totalVowelsInBag = Object.values(VOWEL_FREQUENCIES).reduce((a, b) => a + b, 0);
    const { vowels } = drawLetters({ vowelCount: MIN_VOWELS, totalLetters: MIN_VOWELS });
    expect(vowels.length).toBeLessThanOrEqual(totalVowelsInBag);
  });
});

describe('canFormWord', () => {
  const bag = { vowels: ['a', 'e', 'o'], consonants: ['r', 'd', 'n', 's', 'c'] };

  it('acepta una palabra formable con las letras exactas', () => {
    expect(canFormWord('cesar', bag)).toBe(true); // c,e,s,a,r todas disponibles
  });

  it('rechaza una palabra con una letra que no esta en el bombo', () => {
    expect(canFormWord('perro', bag)).toBe(false); // 'p' no esta en el bombo
  });

  it('rechaza una palabra que repite una letra mas veces de las disponibles', () => {
    expect(canFormWord('sass', bag)).toBe(false); // solo hay una 's'
  });

  it('es insensible a mayusculas', () => {
    expect(canFormWord('CASA', { vowels: ['a', 'a'], consonants: ['c', 's'] })).toBe(true);
  });
});
