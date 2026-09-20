import { describe, expect, it } from 'vitest';
import { decodeFrontCoded, encodeFrontCoded } from '../../src/letters/dictionary-codec.js';

describe('dictionary-codec (front coding)', () => {
  it('reconstruye exactamente un array vacio', () => {
    expect(decodeFrontCoded(encodeFrontCoded([]))).toEqual([]);
  });

  it('reconstruye exactamente un array de una sola palabra', () => {
    expect(decodeFrontCoded(encodeFrontCoded(['casa']))).toEqual(['casa']);
  });

  it('reconstruye exactamente palabras con prefijos compartidos', () => {
    const words = ['abordable', 'abordado', 'abordaje', 'abordar', 'mesa', 'mesas'];
    expect(decodeFrontCoded(encodeFrontCoded(words))).toEqual(words);
  });

  it('preserva palabras con ñ (fuera del rango ASCII)', () => {
    const words = ['nino', 'ninos', 'niño', 'niños', 'sonar'].sort();
    expect(decodeFrontCoded(encodeFrontCoded(words))).toEqual(words);
  });

  it('no comparte prefijo cuando la palabra siguiente es mas corta que la anterior', () => {
    const words = ['perros', 'sol'];
    expect(decodeFrontCoded(encodeFrontCoded(words))).toEqual(words);
  });

  it('produce un tamano menor que un JSON.stringify equivalente para una lista realista y ordenada', () => {
    const words = [
      'abandonado',
      'abandonar',
      'abandono',
      'abanico',
      'abanicos',
      'abarcar',
      'abaratar',
      'abarrotado',
      'abarrotar',
      'abastecer',
    ];
    const encoded = encodeFrontCoded(words);
    const jsonSize = new TextEncoder().encode(JSON.stringify(words)).length;
    expect(encoded.byteLength).toBeLessThan(jsonSize);
  });
});
