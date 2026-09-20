import { describe, expect, it } from 'vitest';
import { generateTarget, TARGET_MAX, TARGET_MIN } from '../../src/numbers/target.js';

describe('generateTarget', () => {
  it('genera un objetivo dentro de [TARGET_MIN, TARGET_MAX]', () => {
    for (let i = 0; i < 200; i++) {
      const target = generateTarget();
      expect(target).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(target).toBeLessThanOrEqual(TARGET_MAX);
      expect(Number.isInteger(target)).toBe(true);
    }
  });

  it('es determinista con un rng inyectado', () => {
    expect(generateTarget(() => 0)).toBe(TARGET_MIN);
    expect(generateTarget(() => 0.999999)).toBe(TARGET_MAX);
  });
});
