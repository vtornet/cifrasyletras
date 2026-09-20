// Tablero de cifras paso a paso - R3.1, R3.3, R3.4. En vez de construir una expresion
// con parentesis, el jugador encadena operaciones de dos en dos (como se resuelve a
// mano): toca un numero, un operador y otro numero -> se calcula y se apila la linea
// "24 x 10 = 240"; el resultado queda disponible para el siguiente paso. Tocar la ficha
// ya elegida como primer operando (o el operador ya elegido) la deselecciona, para poder
// corregir. "Deshacer ultimo paso" devuelve sus dos operandos al tablero.

import { useRef, useState } from 'react';
import styles from './TileBoard.module.css';

export interface NumberBoardProps {
  numbers: number[];
  onSubmit: (answer: string) => void;
}

type Operator = '+' | '-' | '*' | '/';

interface PoolValue {
  id: number;
  value: number;
}

interface CompletedStep {
  resultId: number;
  left: PoolValue;
  operator: Operator;
  right: PoolValue;
  result: number;
}

const OPERATORS: Array<{ value: Operator; label: string }> = [
  { value: '+', label: '+' },
  { value: '-', label: '−' },
  { value: '*', label: '×' },
  { value: '/', label: '÷' },
];

function operatorLabel(op: Operator): string {
  return OPERATORS.find((o) => o.value === op)!.label;
}

/** Calcula el resultado de un paso, o null si no es un entero positivo (paso invalido). */
function computeStep(left: number, operator: Operator, right: number): number | null {
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
      if (right === 0 || left % right !== 0) return null;
      result = left / right;
      break;
  }
  return Number.isInteger(result) && result > 0 ? result : null;
}

function buildSubmission(completedSteps: CompletedStep[], pendingLeft: PoolValue | null): string | null {
  if (completedSteps.length > 0) {
    return completedSteps.map((s) => `${s.left.value}${s.operator}${s.right.value}`).join(';');
  }
  if (pendingLeft) {
    return String(pendingLeft.value); // caso borde: usar un numero de la tirada sin operar
  }
  return null;
}

export function NumberBoard({ numbers, onSubmit }: NumberBoardProps) {
  const idCounter = useRef(0);
  const makeId = () => idCounter.current++;

  const [pool, setPool] = useState<PoolValue[]>(() => numbers.map((value) => ({ id: makeId(), value })));
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [pendingLeft, setPendingLeft] = useState<PoolValue | null>(null);
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetAll() {
    setPool(numbers.map((value) => ({ id: makeId(), value })));
    setCompletedSteps([]);
    setPendingLeft(null);
    setPendingOperator(null);
    setError(null);
  }

  function handleTileClick(item: PoolValue) {
    setError(null);

    if (pendingLeft && pendingLeft.id === item.id) {
      setPendingLeft(null);
      setPendingOperator(null);
      return;
    }
    if (!pendingLeft) {
      setPendingLeft(item);
      return;
    }
    if (!pendingOperator) {
      return; // hace falta elegir un operador antes del segundo numero
    }

    const result = computeStep(pendingLeft.value, pendingOperator, item.value);
    if (result === null) {
      setError('Esa operación no da un resultado entero positivo. Prueba otro número u operador.');
      return;
    }

    const resultId = makeId();
    setCompletedSteps((prev) => [...prev, { resultId, left: pendingLeft, operator: pendingOperator, right: item, result }]);
    setPool((prev) => [...prev.filter((p) => p.id !== pendingLeft.id && p.id !== item.id), { id: resultId, value: result }]);
    setPendingLeft(null);
    setPendingOperator(null);
  }

  function handleOperatorClick(op: Operator) {
    if (!pendingLeft) return;
    setError(null);
    setPendingOperator((prev) => (prev === op ? null : op));
  }

  function undoLastStep() {
    setCompletedSteps((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      setPool((poolPrev) => [...poolPrev.filter((p) => p.id !== last.resultId), last.left, last.right]);
      return prev.slice(0, -1);
    });
    setPendingLeft(null);
    setPendingOperator(null);
    setError(null);
  }

  function handleSubmit() {
    const submission = buildSubmission(completedSteps, pendingLeft);
    if (!submission) return;
    onSubmit(submission);
    resetAll();
  }

  const canSubmit = buildSubmission(completedSteps, pendingLeft) !== null;

  return (
    <div>
      <div className={styles.answerRow} aria-label="Tus operaciones">
        {completedSteps.length === 0 && !pendingLeft && (
          <span className={styles.placeholder}>Toca un número, un operador y otro número</span>
        )}
        <div className={styles.stepsColumn}>
          {completedSteps.map((step) => (
            <div key={step.resultId} className={styles.stepLine}>
              {step.left.value} {operatorLabel(step.operator)} {step.right.value} = {step.result}
            </div>
          ))}
          {pendingLeft && (
            <div className={styles.stepLinePending}>
              {pendingLeft.value} {pendingOperator ? operatorLabel(pendingOperator) : '?'}
              {pendingOperator ? ' ?' : ''}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <div className={styles.tileRow} aria-label="Números disponibles">
        {pool.map((item) => {
          const isSelected = pendingLeft?.id === item.id;
          const isDisabled = !isSelected && pendingLeft !== null && pendingOperator === null;
          return (
            <button
              key={item.id}
              type="button"
              className={isSelected ? `${styles.tile} ${styles.tileSelected}` : styles.tile}
              disabled={isDisabled}
              onClick={() => handleTileClick(item)}
            >
              {item.value}
            </button>
          );
        })}
      </div>

      <div className={styles.operatorRow} aria-label="Operadores">
        {OPERATORS.map((op) => (
          <button
            key={op.value}
            type="button"
            className={pendingOperator === op.value ? `${styles.operatorTile} ${styles.tileSelected}` : styles.operatorTile}
            disabled={!pendingLeft}
            aria-pressed={pendingOperator === op.value}
            onClick={() => handleOperatorClick(op.value)}
          >
            {op.label}
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={undoLastStep} disabled={completedSteps.length === 0}>
          Deshacer último paso
        </button>
        <button type="button" onClick={resetAll} disabled={completedSteps.length === 0 && !pendingLeft}>
          Borrar todo
        </button>
        <button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          Enviar
        </button>
      </div>
    </div>
  );
}
