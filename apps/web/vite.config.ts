/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // el diccionario (~2.3MB comprimido con "front coding", ver
        // docs/dictionary-license.md) supera el limite por defecto de precacheo (2MB)
        // y su extension .dict no esta en el glob por defecto.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,dict}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      // Iconos de marcador de posicion (gradiente + fichas), a la espera de un diseno
      // de marca definitivo (ver AGENTS.md - nota de marca: no usar assets oficiales de RTVE).
      manifest: {
        name: 'Duelo Lexico',
        short_name: 'DueloLexico',
        description: 'Juego de palabras y numeros contra el reloj, en local o en linea',
        theme_color: '#0b0d17',
        background_color: '#0b0d17',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
