import { describe, expect, it } from 'vitest';
import { solveNumbers } from '../../src/numbers/solver.js';
import { validateCalculationSteps } from '../../src/numbers/steps.js';

describe('solveNumbers', () => {
  it('encuentra el resultado exacto cuando es posible', () => {
    // (75 + 25) * 4 = 400
    const result = solveNumbers([75, 25, 4, 2, 1, 9], 400);
    expect(result.exact).toBe(true);
    expect(result.closestValue).toBe(400);
  });

  it('la cadena de pasos devuelta es realmente valida y produce closestValue', () => {
    const available = [75, 25, 4, 2, 1, 9];
    const result = solveNumbers(available, 400);
    const check = validateCalculationSteps(
      available,
      result.steps.map(({ left, operator, right }) => ({ left, operator, right })),
    );
    expect(check.isValid).toBe(true);
    expect(check.finalResult).toBe(result.closestValue);
  });

  it('devuelve la mejor aproximacion cuando el objetivo exacto no es alcanzable', () => {
    // con estos numeros no se puede llegar exactamente a 999
    const result = solveNumbers([1, 2, 3], 999);
    expect(result.exact).toBe(false);
    expect(result.closestValue).toBeLessThanOrEqual(1 + 2 + 3 * 3); // cota superior trivial
  });

  it('con un unico numero, la mejor aproximacion es ese mismo numero y no hace falta ningun paso', () => {
    const result = solveNumbers([42], 999);
    expect(result).toEqual({ exact: false, closestValue: 42, steps: [] });
  });

  it('nunca propone una cadena de pasos con pasos intermedios invalidos', () => {
    const available = [50, 8, 3, 3, 1, 6];
    const result = solveNumbers(available, 673);
    const check = validateCalculationSteps(
      available,
      result.steps.map(({ left, operator, right }) => ({ left, operator, right })),
    );
    expect(check.isValid).toBe(true);
    expect(check.finalResult).toBe(result.closestValue);
  });
});
