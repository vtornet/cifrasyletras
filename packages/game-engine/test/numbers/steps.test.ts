import { describe, expect, it } from 'vitest';
import {
  parseAndValidateSteps,
  parseStepsInput,
  stepsToInput,
  stepsToSubmissionString,
  validateCalculationSteps,
} from '../../src/numbers/steps.js';

describe('validateCalculationSteps', () => {
  const available = [75, 25, 4, 2, 1, 9];

  it('valida un unico paso con dos numeros disponibles', () => {
    const result = validateCalculationSteps(available, [{ left: 75, operator: '+', right: 25 }]);
    expect(result).toEqual({
      isValid: true,
      steps: [{ left: 75, operator: '+', right: 25, result: 100 }],
      finalResult: 100,
    });
  });

  it('encadena pasos: el resultado de uno se puede usar en el siguiente', () => {
    const result = validateCalculationSteps(available, [
      { left: 75, operator: '+', right: 25 }, // = 100
      { left: 100, operator: '*', right: 4 }, // = 400
    ]);
    expect(result.isValid).toBe(true);
    expect(result.finalResult).toBe(400);
    expect(result.steps).toHaveLength(2);
  });

  it('no exige usar todos los numeros ni todos los pasos posibles', () => {
    const result = validateCalculationSteps(available, [{ left: 75, operator: '-', right: 25 }]);
    expect(result).toEqual({
      isValid: true,
      steps: [{ left: 75, operator: '-', right: 25, result: 50 }],
      finalResult: 50,
    });
  });

  it('rechaza usar un numero que no esta disponible', () => {
    const result = validateCalculationSteps(available, [{ left: 75, operator: '+', right: 50 }]);
    expect(result).toEqual({ isValid: false, error: 'right-not-available', errorStepIndex: 0 });
  });

  it('rechaza cuando ni siquiera el primer numero esta disponible', () => {
    const result = validateCalculationSteps(available, [{ left: 50, operator: '+', right: 75 }]);
    expect(result).toEqual({ isValid: false, error: 'left-not-available', errorStepIndex: 0 });
  });

  it('rechaza reusar un numero ya consumido en un paso anterior', () => {
    const result = validateCalculationSteps(available, [
      { left: 75, operator: '+', right: 25 }, // consume 75 y 25
      { left: 75, operator: '+', right: 1 }, // 75 ya no esta disponible
    ]);
    expect(result).toEqual({ isValid: false, error: 'left-not-available', errorStepIndex: 1 });
  });

  it('rechaza un paso con division no exacta', () => {
    const result = validateCalculationSteps(available, [{ left: 9, operator: '/', right: 4 }]);
    expect(result).toEqual({ isValid: false, error: 'non-integer-step', errorStepIndex: 0 });
  });

  it('rechaza un paso con resultado negativo o cero', () => {
    const result = validateCalculationSteps(available, [{ left: 4, operator: '-', right: 9 }]);
    expect(result).toEqual({ isValid: false, error: 'negative-step', errorStepIndex: 0 });
  });

  it('rechaza una lista de pasos vacia', () => {
    expect(validateCalculationSteps(available, [])).toEqual({ isValid: false, error: 'no-steps' });
  });
});

describe('parseStepsInput', () => {
  it('parsea varios pasos separados por ";"', () => {
    expect(parseStepsInput('24*10;240-30')).toEqual([
      { left: 24, operator: '*', right: 10 },
      { left: 240, operator: '-', right: 30 },
    ]);
  });

  it('tolera espacios alrededor de numeros y operadores', () => {
    expect(parseStepsInput(' 24 * 10 ; 240 - 30 ')).toEqual([
      { left: 24, operator: '*', right: 10 },
      { left: 240, operator: '-', right: 30 },
    ]);
  });

  it('devuelve null ante una entrada mal formada', () => {
    expect(parseStepsInput('24 + + 10')).toBeNull();
    expect(parseStepsInput('veinticuatro+10')).toBeNull();
    expect(parseStepsInput('')).toBeNull();
  });
});

describe('parseAndValidateSteps', () => {
  const available = [75, 25, 4];

  it('parsea y valida una cadena de pasos completa', () => {
    const result = parseAndValidateSteps('75+25;100*4', available);
    expect(result.isValid).toBe(true);
    expect(result.finalResult).toBe(400);
  });

  it('acepta un unico numero sin ninguna operacion (caso borde)', () => {
    const result = parseAndValidateSteps('75', available);
    expect(result).toEqual({ isValid: true, steps: [], finalResult: 75 });
  });

  it('rechaza un numero suelto que no esta en la tirada', () => {
    const result = parseAndValidateSteps('50', available);
    expect(result).toEqual({ isValid: false, error: 'left-not-available' });
  });

  it('rechaza sintaxis invalida', () => {
    expect(parseAndValidateSteps('75 & 25', available).error).toBe('invalid-syntax');
    expect(parseAndValidateSteps('', available).error).toBe('no-steps');
  });
});

describe('stepsToInput / stepsToSubmissionString', () => {
  it('serializa pasos al formato "left op right;..."', () => {
    expect(
      stepsToInput([
        { left: 75, operator: '+', right: 25 },
        { left: 100, operator: '*', right: 4 },
      ]),
    ).toBe('75+25;100*4');
  });

  it('el resultado de stepsToInput se puede volver a parsear y valida igual', () => {
    const available = [75, 25, 4];
    const steps = [
      { left: 75, operator: '+' as const, right: 25 },
      { left: 100, operator: '*' as const, right: 4 },
    ];
    const serialized = stepsToInput(steps);
    const reparsed = parseAndValidateSteps(serialized, available);
    expect(reparsed.isValid).toBe(true);
    expect(reparsed.finalResult).toBe(400);
  });

  it('stepsToSubmissionString cae al numero suelto si no hay pasos', () => {
    expect(stepsToSubmissionString([], 75)).toBe('75');
  });

  it('stepsToSubmissionString usa stepsToInput si hay pasos', () => {
    expect(stepsToSubmissionString([{ left: 75, operator: '+', right: 25 }], 999)).toBe('75+25');
  });
});
