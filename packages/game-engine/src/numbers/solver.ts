// Solver de la prueba de cifras - AGENTS.md #6 y R3.5
// Dado un conjunto de numeros y un objetivo, encuentra el resultado exacto si existe
// o la mejor aproximacion posible. Usado por: solucion mostrada al final de la ronda,
// modo CPU (Fase 2) y tests del motor.
//
// Algoritmo: combina numeros por pares (recursivamente) probando +,-,*,/ y quedandose con
// el candidato mas cercano al objetivo. Se memoiza por el multiconjunto de valores restantes
// para no re-explorar el mismo estado alcanzado por distintos ordenes de combinacion. Cada
// combinacion se registra como un ResolvedStep, asi el resultado es directamente la misma
// cadena de pasos que construye el jugador en NumberBoard (ver numbers/steps.ts).

import type { Operator, ResolvedStep } from './steps.js';

export interface SolverResult {
  /** true si se alcanzo el objetivo exacto. */
  exact: boolean;
  /** Mejor valor alcanzable encontrado. */
  closestValue: number;
  /** Cadena de pasos que produce closestValue (vacia si closestValue es uno de los numeros originales). */
  steps: ResolvedStep[];
}

interface Candidate {
  value: number;
  steps: ResolvedStep[];
}

function stateKey(numbers: readonly Candidate[]): string {
  return numbers
    .map((n) => n.value)
    .sort((a, b) => a - b)
    .join(',');
}

/** Busca, entre los numeros disponibles, el resultado exacto o la mejor aproximacion al objetivo. */
export function solveNumbers(availableNumbers: number[], target: number): SolverResult {
  if (availableNumbers.length === 0) {
    throw new Error('solveNumbers: se necesita al menos un numero disponible');
  }

  let best: Candidate = { value: availableNumbers[0]!, steps: [] };
  const visited = new Set<string>();

  function consider(candidate: Candidate): void {
    if (Math.abs(candidate.value - target) < Math.abs(best.value - target)) {
      best = candidate;
    }
  }

  function search(numbers: Candidate[]): void {
    const key = stateKey(numbers);
    if (visited.has(key)) return;
    visited.add(key);

    for (const n of numbers) consider(n);
    if (best.value === target) return; // exacto encontrado, no hace falta seguir
    if (numbers.length <= 1) return;

    for (let i = 0; i < numbers.length; i++) {
      for (let j = 0; j < numbers.length; j++) {
        if (i === j) continue;
        const a = numbers[i]!;
        const b = numbers[j]!;
        const rest = numbers.filter((_, idx) => idx !== i && idx !== j);

        const combos: Array<{ value: number; operator: Operator }> = [
          { value: a.value + b.value, operator: '+' },
          { value: a.value * b.value, operator: '*' },
        ];
        if (a.value > b.value) {
          combos.push({ value: a.value - b.value, operator: '-' });
        }
        if (b.value !== 0 && a.value % b.value === 0) {
          combos.push({ value: a.value / b.value, operator: '/' });
        }

        for (const combo of combos) {
          if (combo.value <= 0) continue;
          const step: ResolvedStep = { left: a.value, operator: combo.operator, right: b.value, result: combo.value };
          search([...rest, { value: combo.value, steps: [...a.steps, ...b.steps, step] }]);
          if (best.value === target) return;
        }
      }
      if (best.value === target) return;
    }
  }

  search(availableNumbers.map((n) => ({ value: n, steps: [] })));

  return {
    exact: best.value === target,
    closestValue: best.value,
    steps: best.steps,
  };
}
