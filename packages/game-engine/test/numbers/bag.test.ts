import { describe, expect, it } from 'vitest';
import {
  BIG_NUMBERS,
  drawNumbers,
  SMALL_NUMBERS,
  TOTAL_NUMBERS_DRAWN,
} from '../../src/numbers/bag.js';

describe('drawNumbers', () => {
  it('devuelve TOTAL_NUMBERS_DRAWN numeros', () => {
    for (let big = 0; big <= 4; big++) {
      expect(drawNumbers({ bigNumberCount: big })).toHaveLength(TOTAL_NUMBERS_DRAWN);
    }
  });

  it('respeta el numero de numeros grandes pedido', () => {
    const numbers = drawNumbers({ bigNumberCount: 2 });
    const bigCount = numbers.filter((n) => (BIG_NUMBERS as readonly number[]).includes(n)).length;
    expect(bigCount).toBe(2);
  });

  it('el resto son numeros pequenos (1-10)', () => {
    const numbers = drawNumbers({ bigNumberCount: 1 });
    const smallOnes = numbers.filter((n) => (SMALL_NUMBERS as readonly number[]).includes(n));
    expect(smallOnes).toHaveLength(5);
  });

  it('no repite un numero grande (solo hay 1 copia de cada)', () => {
    const numbers = drawNumbers({ bigNumberCount: 4 });
    const bigOnes = numbers.filter((n) => (BIG_NUMBERS as readonly number[]).includes(n));
    expect(new Set(bigOnes).size).toBe(4);
  });

  it('no repite un numero pequeno mas de 2 veces (solo hay 2 copias de cada)', () => {
    const numbers = drawNumbers({ bigNumberCount: 0 });
    const counts = new Map<number, number>();
    for (const n of numbers) counts.set(n, (counts.get(n) ?? 0) + 1);
    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it.each([-1, 5, 1.5])('rechaza bigNumberCount invalido (%s)', (bigNumberCount) => {
    expect(() => drawNumbers({ bigNumberCount })).toThrow();
  });
});
