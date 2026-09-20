// Eleccion de rival antes de empezar una partida Local - R4.3: practicar en solitario o
// jugar contra el bot con una de tres dificultades (ver game-engine/src/cpu/bot.ts).

import type { CpuDifficulty } from '@duelo-lexico/game-engine';
import styles from './OpponentPicker.module.css';

export interface OpponentPickerProps {
  onChoose: (opponent: CpuDifficulty | null) => void;
}

const DIFFICULTY_OPTIONS: Array<{ value: CpuDifficulty; label: string; desc: string }> = [
  { value: 'easy', label: 'Fácil', desc: 'La CPU ve pocas fichas y falla a menudo' },
  { value: 'normal', label: 'Normal', desc: 'La CPU juega de forma razonable' },
  { value: 'hard', label: 'Difícil', desc: 'La CPU casi siempre da la mejor respuesta' },
];

export function OpponentPicker({ onChoose }: OpponentPickerProps) {
  return (
    <main>
      <h1>¿Cómo quieres jugar?</h1>
      <div className={styles.options}>
        <button type="button" className={`${styles.option} ${styles.featured}`} onClick={() => onChoose(null)}>
          <span className={styles.optionTitle}>Solo</span>
          <span className={styles.optionDesc}>Practica a tu ritmo, sin rival</span>
        </button>
        {DIFFICULTY_OPTIONS.map(({ value, label, desc }) => (
          <button key={value} type="button" className={styles.option} onClick={() => onChoose(value)}>
            <span className={styles.optionTitle}>Contra la CPU — {label}</span>
            <span className={styles.optionDesc}>{desc}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
