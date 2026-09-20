// Registro del service worker (vite-plugin-pwa) - NFR1: PWA instalable y offline.

import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker(): void {
  registerSW({ immediate: true });
}
