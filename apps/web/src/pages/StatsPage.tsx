// Estadisticas del modo Practica (R4.1) - lee las partidas guardadas en IndexedDB.

import { useEffect, useState } from 'react';
import { computeAggregatedStats, listMatches, type AggregatedStats, type StoredMatch } from '../modes/local/stats';
import styles from './StatsPage.module.css';

export interface StatsPageProps {
  onExit: () => void;
}

export function StatsPage({ onExit }: StatsPageProps) {
  const [aggregated, setAggregated] = useState<AggregatedStats | null>(null);
  const [matches, setMatches] = useState<StoredMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([computeAggregatedStats(), listMatches()]).then(([agg, list]) => {
      setAggregated(agg);
      setMatches(list);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main>
        <p>Cargando estadísticas…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Estadísticas</h1>

      {aggregated && aggregated.matchesPlayed > 0 ? (
        <>
          <div className={styles.grid}>
            <div className={`card ${styles.stat}`}>
              <span className={styles.statValue}>{aggregated.matchesPlayed}</span>
              <span className={styles.statLabel}>Partidas jugadas</span>
            </div>
            <div className={`card ${styles.stat}`}>
              <span className={`${styles.statValue} gradient-text`}>{aggregated.bestScore}</span>
              <span className={styles.statLabel}>Mejor puntuación</span>
            </div>
            <div className={`card ${styles.stat}`}>
              <span className={styles.statValue}>{aggregated.averageScore.toFixed(1)}</span>
              <span className={styles.statLabel}>Puntuación media</span>
            </div>
            <div className={`card ${styles.stat}`}>
              <span className={styles.statValue}>{aggregated.bestNumbersExactCount}</span>
              <span className={styles.statLabel}>Cifras exactas</span>
            </div>
            <div className={`card ${styles.stat} ${styles.wide}`}>
              <span className={styles.statValue}>{aggregated.bestWord ?? '—'}</span>
              <span className={styles.statLabel}>Mejor palabra encontrada</span>
            </div>
          </div>

          <h2 className={styles.historyTitle}>Historial</h2>
          <ol className={styles.historyList}>
            {matches.map((match) => (
              <li key={match.id} className={styles.historyRow}>
                <span>{new Date(match.playedAt).toLocaleString()}</span>
                <span className={styles.historyScore}>{match.totalScore} pts</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className={styles.empty}>Todavía no has terminado ninguna partida en modo Local.</p>
      )}

      <button type="button" className="primary" onClick={onExit}>
        Volver al inicio
      </button>
    </main>
  );
}
