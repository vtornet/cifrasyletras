// Boton "Volver al inicio" reutilizable en todas las pantallas del juego. Si hay una
// partida en curso (confirmExit) pide confirmacion antes de salir, porque se pierde el
// progreso (modo Local) o se abandona la sala (modo Online).

import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './HomeButton.module.css';

export interface HomeButtonProps {
  onExit: () => void;
  /** Hay una partida en curso: pide confirmacion antes de salir. */
  confirmExit?: boolean;
  /** Accion a ejecutar antes de salir si se confirma (p.ej. leaveRoom() en modo Online). */
  onBeforeExit?: () => void;
}

export function HomeButton({ onExit, confirmExit = false, onBeforeExit }: HomeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const doExit = () => {
    onBeforeExit?.();
    onExit();
  };

  return (
    <>
      <button
        type="button"
        className={styles.homeButton}
        onClick={() => (confirmExit ? setShowConfirm(true) : doExit())}
      >
        ← Inicio
      </button>
      {showConfirm && (
        <ConfirmDialog
          title="¿Salir de la partida?"
          message="Si sales ahora perderás el progreso de esta partida."
          confirmLabel="Salir"
          cancelLabel="Seguir jugando"
          onConfirm={doExit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
