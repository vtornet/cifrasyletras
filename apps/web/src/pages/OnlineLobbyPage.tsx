// Lobby online - R5.1: crear sala (codigo de 6 caracteres + enlace de invitacion) o
// unirse con un codigo (a mano o via enlace ?room=CODIGO, ver App.tsx).

import { useEffect, useRef, useState } from 'react';
import { InviteLink } from '../components/InviteLink';
import { useOnlineMatchStore } from '../modes/online';
import styles from './OnlineLobbyPage.module.css';

export interface OnlineLobbyPageProps {
  onRoomReady: () => void;
  /** Codigo recibido por enlace de invitacion (?room=CODIGO): se intenta unir automaticamente. */
  autoJoinCode?: string | null;
}

export function OnlineLobbyPage({ onRoomReady, autoJoinCode }: OnlineLobbyPageProps) {
  const { phase, roomId, errorMessage, createRoom, joinRoom } = useOnlineMatchStore();
  const [joinCode, setJoinCode] = useState(autoJoinCode ?? '');
  const hasAutoJoined = useRef(false);

  useEffect(() => {
    if (autoJoinCode && !hasAutoJoined.current) {
      hasAutoJoined.current = true;
      joinRoom(autoJoinCode.trim().toUpperCase());
    }
  }, [autoJoinCode, joinRoom]);

  useEffect(() => {
    if (phase !== 'disconnected') onRoomReady();
  }, [phase, onRoomReady]);

  return (
    <main>
      <h1>Jugar Online</h1>

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <div className={`card ${styles.section}`}>
        <p className={styles.sectionTitle}>Crear una sala nueva</p>
        <button type="button" className="primary" onClick={createRoom}>
          Crear sala
        </button>
        {roomId && <InviteLink roomId={roomId} />}
      </div>

      <div className={styles.divider}>o</div>

      <div className={`card ${styles.section}`}>
        <p className={styles.sectionTitle}>Unirse a una sala</p>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            joinRoom(joinCode.trim().toUpperCase());
          }}
        >
          <label className={styles.label}>
            Código de sala
            <input
              type="text"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="AB12CD"
              aria-label="Código de la sala a la que unirse"
            />
          </label>
          <button type="submit">Unirse</button>
        </form>
      </div>
    </main>
  );
}
