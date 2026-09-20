// Codigo de sala + formas de compartir la invitacion - R5.1: WhatsApp, Telegram,
// copiar enlace, y el dialogo nativo de compartir del sistema si esta disponible.

import { useState } from 'react';
import {
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  canShareNatively,
  copyInviteLink,
  shareInviteLink,
} from '../modes/online/inviteLink';
import styles from './InviteLink.module.css';

export interface InviteLinkProps {
  roomId: string;
}

export function InviteLink({ roomId }: InviteLinkProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareFailed, setShareFailed] = useState(false);

  async function handleCopy() {
    const ok = await copyInviteLink(roomId);
    setCopyStatus(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyStatus('idle'), 2000);
  }

  async function handleNativeShare() {
    const result = await shareInviteLink(roomId);
    setShareFailed(result === 'failed');
    if (result === 'failed') setTimeout(() => setShareFailed(false), 2000);
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Código de la sala</span>
      <span className={styles.code}>{roomId}</span>

      <div className={styles.shareRow}>
        <a
          className={`${styles.shareButton} ${styles.whatsapp}`}
          href={buildWhatsAppShareUrl(roomId)}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
        <a
          className={`${styles.shareButton} ${styles.telegram}`}
          href={buildTelegramShareUrl(roomId)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram
        </a>
      </div>

      <button type="button" onClick={handleCopy}>
        {copyStatus === 'copied' ? 'Enlace copiado' : copyStatus === 'failed' ? 'No se pudo copiar' : 'Copiar enlace'}
      </button>

      {canShareNatively() && (
        <button type="button" onClick={handleNativeShare}>
          {shareFailed ? 'No se pudo compartir' : 'Compartir con otra app…'}
        </button>
      )}
    </div>
  );
}
