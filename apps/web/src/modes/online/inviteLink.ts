// Enlace de invitacion a una sala - R5.1. Abrir ?room=CODIGO lleva directo al lobby
// online con ese codigo listo para unirse (ver App.tsx). Ademas de copiar el enlace,
// se puede compartir directo a WhatsApp/Telegram o con el dialogo nativo del sistema.

export function buildInviteLink(roomId: string): string {
  const url = new URL(window.location.href);
  url.search = `?room=${roomId}`;
  url.hash = '';
  return url.toString();
}

function buildShareText(roomId: string): string {
  return `Únete a mi partida de Duelo Léxico. Código: ${roomId} → ${buildInviteLink(roomId)}`;
}

/** Copia el enlace al portapapeles. Devuelve false si el navegador lo bloquea (sin permiso, contexto no seguro, etc). */
export async function copyInviteLink(roomId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildInviteLink(roomId));
    return true;
  } catch {
    return false;
  }
}

/** Enlace "wa.me": abre WhatsApp (app o web) con el mensaje ya escrito, sin necesitar la API de contactos. */
export function buildWhatsAppShareUrl(roomId: string): string {
  return `https://wa.me/?text=${encodeURIComponent(buildShareText(roomId))}`;
}

/** Enlace de comparticion oficial de Telegram: abre la app o Telegram Web con el enlace listo para reenviar. */
export function buildTelegramShareUrl(roomId: string): string {
  const params = new URLSearchParams({
    url: buildInviteLink(roomId),
    text: `Únete a mi partida de Duelo Léxico. Código: ${roomId}`,
  });
  return `https://t.me/share/url?${params.toString()}`;
}

export function canShareNatively(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export type ShareResult = 'shared' | 'cancelled' | 'unsupported' | 'failed';

/** Abre el dialogo nativo de compartir del sistema (cualquier app instalada: WhatsApp, Telegram, SMS, email...). */
export async function shareInviteLink(roomId: string): Promise<ShareResult> {
  if (!canShareNatively()) return 'unsupported';
  try {
    await navigator.share({
      title: 'Duelo Léxico',
      text: `Únete a mi partida de Duelo Léxico. Código: ${roomId}`,
      url: buildInviteLink(roomId),
    });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'; // el usuario cerro el dialogo
    return 'failed';
  }
}
