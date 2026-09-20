// Muestra una cadena de operaciones (numbers/steps.ts) una debajo de otra, p.ej.:
//   24 × 10 = 240
//   240 − 30 = 210

import type { ResolvedStep } from '@duelo-lexico/game-engine';
import styles from './TileBoard.module.css';

export const OPERATOR_LABELS: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export interface StepsListProps {
  steps: ResolvedStep[];
  /** Valor a mostrar cuando steps esta vacio (0 pasos: se usa un numero de la tirada tal cual). */
  fallbackValue?: number;
}

// Sin numeracion (1., 2., 3.): una lista <ol> confundia, como si el orden fuera parte del
// resultado a leer. Son simplemente lineas apiladas, igual que en NumberBoard mientras se
// construyen (misma clase .stepLine, para que se vean igual).
export function StepsList({ steps, fallbackValue }: StepsListProps) {
  if (steps.length === 0) {
    return <p>{fallbackValue ?? '—'}</p>;
  }
  return (
    <div className={styles.stepsColumn}>
      {steps.map((step, i) => (
        <div key={i} className={styles.stepLine}>
          {step.left} {OPERATOR_LABELS[step.operator]} {step.right} = {step.result}
        </div>
      ))}
    </div>
  );
}

/** Version compacta en una sola linea, p.ej. "24×10=240 → 240−30=210" (para resumenes). */
export function formatStepsInline(steps: ResolvedStep[], fallbackValue?: number): string {
  if (steps.length === 0) return fallbackValue !== undefined ? String(fallbackValue) : '—';
  return steps.map((s) => `${s.left}${OPERATOR_LABELS[s.operator]}${s.right}=${s.result}`).join(' → ');
}
