# Duelo Léxico (nombre de trabajo)

PWA de palabras y números contra el reloj — modo Local (1 jugador) y Online (2 jugadores). Diseño completo, reglas y decisiones de arquitectura en [`AGENTS.md`](./AGENTS.md); reglas de referencia del formato original en [`docs/rules-reference.md`](./docs/rules-reference.md).

## Requisitos

- Node.js ≥ 20
- pnpm (`corepack enable` o `npm i -g pnpm`)

## Empezar

```bash
pnpm install
pnpm dev:web      # PWA en http://localhost:5173
pnpm dev:server   # servidor Socket.IO en http://localhost:3001
```

## Otros comandos

```bash
pnpm -r test        # tests en todos los paquetes
pnpm -r typecheck
pnpm -r lint         # oxlint (apps/web)
pnpm -r build
```

## Estructura

```
packages/game-engine   → reglas del juego (TS puro, compartido cliente/servidor)
apps/web                → PWA React + Vite
apps/server              → servidor Socket.IO (modo Online, autoritativo)
```

Ver [`AGENTS.md`](./AGENTS.md) §5 para el detalle completo y §7 para el estado de cada requisito.

## Despliegue (Railway)

Dos servicios desde este mismo repo, **sin fijar Root Directory** en ninguno (debe quedarse en la raíz — ver AGENTS.md §9, si no pnpm no resuelve `@duelo-lexico/game-engine`):

| Servicio | Build Command | Start Command | Variables |
|---|---|---|---|
| `server` | `pnpm --filter server build` | `pnpm --filter server start` | `CLIENT_ORIGIN` = URL pública de `web` (restringe CORS) |
| `web` | `pnpm --filter web build` | `pnpm --filter web start` | `VITE_SERVER_URL` = URL pública de `server` (debe estar puesta *antes* de compilar: Vite la incrusta en el build) |

En `server`, dejar **Serverless desactivado** y **1 sola réplica** (el estado de las salas vive en memoria del proceso).
