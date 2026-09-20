// Pantalla de inicio - R1.1: seleccion de modo Local (1 jugador) u Online (2 jugadores)

import styles from './HomePage.module.css';

export interface HomePageProps {
  onSelectLocal: () => void;
  onSelectOnline: () => void;
  onSelectStats: () => void;
}

export function HomePage({ onSelectLocal, onSelectOnline, onSelectStats }: HomePageProps) {
  return (
    <main>
      <div className={styles.hero}>
        <h1 className={`${styles.title} gradient-text`}>Duelo Léxico</h1>
        <p className={styles.subtitle}>Palabras y números contra el reloj.</p>
      </div>

      <div className={styles.modes}>
        <button type="button" className={`${styles.modeCard} ${styles.featured}`} onClick={onSelectLocal}>
          <span className={styles.modeTitle}>Jugar en local</span>
          <span className={styles.modeDesc}>Practica en solitario, sin conexión</span>
        </button>
        <button type="button" className={styles.modeCard} onClick={onSelectOnline}>
          <span className={styles.modeTitle}>Jugar online</span>
          <span className={styles.modeDesc}>Reto en tiempo real a 2 jugadores</span>
        </button>
      </div>

      <button type="button" className={styles.statsLink} onClick={onSelectStats}>
        Ver estadísticas
      </button>
    </main>
  );
}
