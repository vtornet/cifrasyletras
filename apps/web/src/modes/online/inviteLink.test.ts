import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildInviteLink,
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  canShareNatively,
  copyInviteLink,
  shareInviteLink,
} from './inviteLink';

function setClipboard(clipboard: Pick<Clipboard, 'writeText'> | undefined): void {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
}

function setNativeShare(share: typeof navigator.share | undefined): void {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
}

describe('buildInviteLink', () => {
  it('genera una URL con ?room=CODIGO y sin fragmento', () => {
    const link = buildInviteLink('AB12CD');
    const url = new URL(link);
    expect(url.searchParams.get('room')).toBe('AB12CD');
    expect(url.hash).toBe('');
  });
});

describe('copyInviteLink', () => {
  afterEach(() => {
    setClipboard(undefined);
  });

  it('copia el enlace y devuelve true cuando el portapapeles está disponible', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    const ok = await copyInviteLink('AB12CD');

    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]![0]).toContain('room=AB12CD');
  });

  it('devuelve false si no hay portapapeles disponible', async () => {
    setClipboard(undefined);
    const ok = await copyInviteLink('AB12CD');
    expect(ok).toBe(false);
  });

  it('devuelve false si el portapapeles rechaza la copia', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('sin permiso')) });
    const ok = await copyInviteLink('AB12CD');
    expect(ok).toBe(false);
  });
});

describe('buildWhatsAppShareUrl', () => {
  it('genera un enlace wa.me con el codigo y el enlace en el texto', () => {
    const url = buildWhatsAppShareUrl('AB12CD');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    const text = decodeURIComponent(url.split('text=')[1]!);
    expect(text).toContain('AB12CD');
    expect(text).toContain('room=AB12CD');
  });
});

describe('buildTelegramShareUrl', () => {
  it('genera un enlace t.me/share con url y texto separados', () => {
    const url = new URL(buildTelegramShareUrl('AB12CD'));
    expect(url.origin + url.pathname).toBe('https://t.me/share/url');
    expect(url.searchParams.get('url')).toContain('room=AB12CD');
    expect(url.searchParams.get('text')).toContain('AB12CD');
  });
});

describe('canShareNatively / shareInviteLink', () => {
  afterEach(() => {
    setNativeShare(undefined);
  });

  it('canShareNatively es false si navigator.share no existe', () => {
    setNativeShare(undefined);
    expect(canShareNatively()).toBe(false);
  });

  it('shareInviteLink devuelve "unsupported" si el navegador no tiene Web Share API', async () => {
    setNativeShare(undefined);
    expect(await shareInviteLink('AB12CD')).toBe('unsupported');
  });

  it('shareInviteLink devuelve "shared" y llama a navigator.share con el enlace', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNativeShare(share);

    const result = await shareInviteLink('AB12CD');

    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    const payload = share.mock.calls[0]![0] as ShareData;
    expect(payload.text).toContain('AB12CD');
    expect(payload.url).toContain('room=AB12CD');
  });

  it('shareInviteLink devuelve "cancelled" si el usuario cierra el dialogo', async () => {
    setNativeShare(vi.fn().mockRejectedValue(new DOMException('cancelado', 'AbortError')));
    expect(await shareInviteLink('AB12CD')).toBe('cancelled');
  });

  it('shareInviteLink devuelve "failed" ante otros errores', async () => {
    setNativeShare(vi.fn().mockRejectedValue(new Error('algo fue mal')));
    expect(await shareInviteLink('AB12CD')).toBe('failed');
  });
});
