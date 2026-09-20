// Validacion de la prueba de cifras por pasos encadenados - AGENTS.md #6 y R3.4
// Simplificacion pedida por el usuario: en vez de una expresion con parentesis, el
// jugador encadena operaciones de dos en dos, igual que se resuelve a mano:
//   24 x 10 = 240
//   240 - 30 = 210
// Cada paso usa dos valores disponibles (numeros originales de la tirada, o el
// resultado de un paso anterior) y los "consume"; el resultado queda disponible
// para el siguiente paso. No hace falta parsear precedencia ni parentesis.

export type Operator = '+' | '-' | '*' | '/';

export interface CalculationStep {
  left: number;
  operator: Operator;
  right: number;
}

export interface ResolvedStep extends CalculationStep {
  result: number;
}

export type StepsError =
  | 'no-steps'
  | 'left-not-available'
  | 'right-not-available'
  | 'non-integer-step'
  | 'negative-step'
  | 'division-by-zero'
  | 'invalid-syntax';

export interface StepsValidationResult {
  isValid: boolean;
  steps?: ResolvedStep[];
  finalResult?: number;
  error?: StepsError;
  errorStepIndex?: number;
}

/**
 * Valida una cadena de pasos contra los numeros disponibles: cada paso consume dos
 * valores del "pool" (numeros originales o resultados de pasos previos) y produce uno
 * nuevo. No exige usar todos los numeros ni todos los pasos posibles.
 */
export function validateCalculationSteps(
  availableNumbers: number[],
  steps: CalculationStep[],
): StepsValidationResult {
  if (steps.length === 0) {
    return { isValid: false, error: 'no-steps' };
  }

  const pool = [...availableNumbers];
  const resolved: ResolvedStep[] = [];

  for (let i = 0; i < steps.length; i++) {
    const { left, operator, right } = steps[i]!;

    const leftIndex = pool.indexOf(left);
    if (leftIndex === -1) return { isValid: false, error: 'left-not-available', errorStepIndex: i };
    pool.splice(leftIndex, 1);

    const rightIndex = pool.indexOf(right);
    if (rightIndex === -1) return { isValid: false, error: 'right-not-available', errorStepIndex: i };
    pool.splice(rightIndex, 1);

    let result: number;
    switch (operator) {
      case '+':
        result = left + right;
        break;
      case '-':
        result = left - right;
        break;
      case '*':
        result = left * right;
        break;
      case '/':
        if (right === 0) return { isValid: false, error: 'division-by-zero', errorStepIndex: i };
        result = left / right;
        break;
    }

    if (!Number.isInteger(result)) return { isValid: false, error: 'non-integer-step', errorStepIndex: i };
    if (result <= 0) return { isValid: false, error: 'negative-step', errorStepIndex: i };

    pool.push(result);
    resolved.push({ left, operator, right, result });
  }

  return { isValid: true, steps: resolved, finalResult: resolved[resolved.length - 1]!.result };
}

/** Parsea "24*10;240-30" (pasos separados por ";") a CalculationStep[]. */
export function parseStepsInput(input: string): CalculationStep[] | null {
  const parts = input
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) return null;

  const steps: CalculationStep[] = [];
  for (const part of parts) {
    const match = /^(\d+)\s*([+\-*/])\s*(\d+)$/.exec(part);
    if (!match) return null;
    steps.push({ left: Number(match[1]), operator: match[2] as Operator, right: Number(match[3]) });
  }
  return steps;
}

/**
 * Punto de entrada usado por el store local y el servidor: parsea y valida en un paso.
 * Tambien acepta un unico numero sin operar (p.ej. "75"), para el caso borde de que el
 * jugador decida no hacer ninguna operacion y usar tal cual uno de los numeros repartidos.
 */
export function parseAndValidateSteps(input: string, availableNumbers: number[]): StepsValidationResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { isValid: false, error: 'no-steps' };

  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (!availableNumbers.includes(value)) {
      return { isValid: false, error: 'left-not-available' };
    }
    return { isValid: true, steps: [], finalResult: value };
  }

  const steps = parseStepsInput(trimmed);
  if (!steps) return { isValid: false, error: 'invalid-syntax' };
  return validateCalculationSteps(availableNumbers, steps);
}

/** Serializa una cadena de pasos al formato de texto "24*10;240-30". */
export function stepsToInput(steps: CalculationStep[]): string {
  return steps.map((s) => `${s.left}${s.operator}${s.right}`).join(';');
}

/** Como stepsToInput, pero cae al numero sin operar si steps esta vacio (0 pasos). */
export function stepsToSubmissionString(steps: CalculationStep[], bareValueFallback: number): string {
  return steps.length === 0 ? String(bareValueFallback) : stepsToInput(steps);
}
