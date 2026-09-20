// Cronometro - R2.2 (30s letras) / R3.3 (40s cifras).
// deadline es un timestamp absoluto (Date.now()-style), no una cuenta atras relativa:
// en modo online lo fija el servidor para no depender de la latencia (ver AGENTS.md #10).
// Anillo de progreso que cambia de color segun el tiempo restante (verde -> ambar -> rojo).

import { useEffect, useRef, useState } from 'react';
import styles from './Cronometro.module.css';

export interface CronometroProps {
  deadline: number;
  onExpire?: () => void;
}

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Cronometro({ deadline, onExpire }: CronometroProps) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, deadline - Date.now()));
  const totalMsRef = useRef(remainingMs);

  useEffect(() => {
    const initial = Math.max(0, deadline - Date.now());
    totalMsRef.current = initial || 1; // evita dividir por 0 si deadline ya paso
    setRemainingMs(initial);

    const interval = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const fraction = Math.min(1, remainingMs / totalMsRef.current);
  const seconds = Math.ceil(remainingMs / 1000);
  const urgency = fraction < 0.2 ? 'danger' : fraction < 0.5 ? 'warning' : 'success';

  return (
    <div className={styles.wrapper} aria-live="polite" role="timer">
      <svg viewBox="0 0 72 72" className={styles.ring}>
        <circle cx="36" cy="36" r={RADIUS} className={styles.track} />
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          className={`${styles.progress} ${styles[urgency]}`}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
        />
      </svg>
      <span className={styles.seconds}>{seconds}</span>
    </div>
  );
}
