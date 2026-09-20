// Pantalla de eleccion antes de cada ronda - R2.1 (vocales, 3-6) / R3.1 (numeros
// grandes, 0-4). El jugador en turno toca un numero; deadline es opcional (el modo
// Online la usa porque el servidor aplica un valor por defecto si no se elige a tiempo,
// el modo Local no tiene prisa por elegir).

import type { RoundKind } from '@duelo-lexico/game-engine';
import { Cronometro } from './Cronometro';
import styles from './TileBoard.module.css';

export interface ChoicePickerProps {
  kind: RoundKind;
  min: number;
  max: number;
  deadline?: number;
  onChoose: (count: number) => void;
}

export function ChoicePicker({ kind, min, max, deadline, onChoose }: ChoicePickerProps) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div>
      <p>{kind === 'letters' ? '¿Cuántas vocales quieres? (3-6)' : '¿Cuántos números grandes quieres? (0-4)'}</p>
      {deadline !== undefined && <Cronometro deadline={deadline} />}
      <div className={styles.choiceRow}>
        {options.map((n) => (
          <button key={n} type="button" className={styles.choiceTile} onClick={() => onChoose(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
