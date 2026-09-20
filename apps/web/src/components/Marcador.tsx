// Marcador de partida - R1.3: puntos acumulados por jugador, visible en toda la partida.

import styles from './Marcador.module.css';

export interface MarcadorProps {
  scores: Record<string, number>;
}

export function Marcador({ scores }: MarcadorProps) {
  return (
    <aside className={styles.marcador} aria-label="Marcador">
      {Object.entries(scores).map(([player, score]) => (
        <div key={player} className={styles.row}>
          <span className={styles.name}>{player}</span>
          <span className={styles.score}>{score}</span>
        </div>
      ))}
    </aside>
  );
}
