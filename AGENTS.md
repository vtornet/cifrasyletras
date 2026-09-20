# AGENTS.md — Duelo Léxico (nombre de trabajo)

> Guía operativa para agentes de IA (y humanos) que trabajen en este repositorio.
> Fuente de verdad centralizada: requisitos, arquitectura y decisiones de diseño.
> Complementa `docs/rules-reference.md` (reglas exactas del formato original en el que se inspira el juego).

## ⚠️ Nota de marca

El proyecto se inspira en la dinámica del concurso de RTVE *"Cifras y Letras"* (a su vez adaptación del formato británico *Countdown*). **"Cifras y Letras" es una marca registrada de RTVE.** Este repositorio es un desarrollo propio, no oficial, con reglas reimplementadas a partir de información pública. No usar el nombre, logo, tipografía o sintonía originales en ningún asset público. `"Duelo Léxico"` es un nombre de trabajo provisional — pendiente de decisión final del usuario antes de publicar.

---

## 1. Visión del Proyecto

PWA (Progressive Web App) que reproduce la mecánica central del concurso: **Prueba de Letras** (formar la palabra más larga con 10 letras) y **Prueba de Cifras** (alcanzar un número objetivo con 6 números y las 4 operaciones básicas), alternadas en una partida con marcador.

Dos modos de juego:
- **Local (1 jugador):** partida en solitario en un solo dispositivo, 100% offline, sin necesidad de red.
- **Online (2 jugadores):** dos jugadores en dispositivos distintos, en tiempo real, sala con código de invitación.

Sin cuentas de usuario, sin backend de datos persistente en el MVP. Todo el peso está en el **motor de reglas del juego**, compartido entre cliente y servidor para que la lógica no diverja entre el modo local y el modo online.

## 2. Alcance por Fases

| Fase | Contenido |
|---|---|
| **Fase 1 (MVP)** | Prueba de Letras + Prueba de Cifras alternadas, modo Local (práctica) y modo Online (2 jugadores), marcador, PWA instalable |
| **Fase 2** | Rival CPU en modo Local, "Los Duelos" (mini-pruebas rápidas con pulsador), estadísticas históricas, sonido/animaciones |
| **Fase 3** | Ronda final temática (12 palabras), sistema de "campeón" a lo largo de varias partidas, ranking online (requeriría backend persistente) |

Este documento cubre el diseño completo; Fase 2 y 3 se detallan a nivel de requisito pero se implementarán después del MVP.

## 3. Stack Tecnológico y Herramientas

| Capa | Elección | Por qué |
|---|---|---|
| Lenguaje | **TypeScript estricto** en todo el monorepo | Tipos compartidos entre cliente/servidor vía el paquete `game-engine`; evita que las reglas diverjan |
| Gestor de paquetes / monorepo | **pnpm + pnpm workspaces** | Instalación rápida, `node_modules` estricto, ideal para compartir un paquete interno entre dos apps |
| Cliente (web/PWA) | **React 18 + Vite** | Mismo stack que proyectos previos del usuario; Vite tiene el plugin PWA más maduro (`vite-plugin-pwa` + Workbox) |
| Gestión de estado cliente | **Zustand** | Ligero, sin boilerplate, encaja bien recibiendo eventos de un socket y mutando estado de partida |
| Estilos | **CSS Modules** + tokens de diseño en `index.css` (color, tipografía, radios, sombras), tema oscuro por defecto | Sin dependencias de UI pesadas, consistente con la política de "solo lo necesario". Tipografía: **Fredoka** (títulos, fichas, puntuaciones) + **Inter** (texto), vía Google Fonts en `index.html` — únicas fuentes externas del proyecto, no son dependencias npm |
| Servidor tiempo real | **Node.js + TypeScript + Socket.IO** | Salas nativas, reconexión automática, fallback a long-polling; evita reinventar el protocolo sobre WebSocket crudo |
| Motor de reglas | **Paquete interno `packages/game-engine`, TS puro, sin dependencias de framework** | Se ejecuta igual en el cliente (modo local/offline) y en el servidor (modo online, autoritativo) |
| Persistencia local | **IndexedDB** (vía `idb`) | Historial de partidas/estadísticas del modo Local, funciona offline |
| Testing | **Vitest** (+ Testing Library para componentes) | Mismo runner que usa Vite, rápido, sin configuración extra |
| Lint/format | **oxlint** (web) **+ Prettier** (formato en todo el monorepo) | `oxlint` es el linter por defecto del scaffold actual de Vite (Rust, cero configuración, muy rápido); se sustituye la elección original de ESLint documentada en la primera versión de este documento — ver §9 |
| PWA | **Web App Manifest + Service Worker (Workbox, vía `vite-plugin-pwa`)** | Instalable, funcionamiento offline garantizado en modo Local |

**Dependencias externas permitidas** (política estricta, igual que en proyectos anteriores del usuario): las de la tabla anterior, más `socket.io-client`, `idb`, `zod` (validación de payloads del socket), `workbox-window` (dependencia directa que exige pnpm para el registro del service worker). Cualquier otra dependencia debe justificarse en la tabla de Decisiones de Diseño (§9) antes de añadirse.

## 4. Arquitectura del Sistema

```
                    ┌─────────────────────────┐
                    │   packages/game-engine   │   TS puro, sin deps de framework
                    │  - bombo de letras       │
                    │  - bolsa de números      │
                    │  - validador de palabras │
                    │  - cadena de pasos cifras│
                    │  - solver de cifras      │
                    │  - máquina de estados    │
                    │  - cálculo de puntuación │
                    └────────────┬─────────────┘
                                 │ import
            ┌────────────────────┴────────────────────┐
            │                                          │
   ┌────────▼─────────┐                      ┌─────────▼─────────┐
   │   apps/web (PWA)  │                      │   apps/server      │
   │  React + Vite     │◄──── Socket.IO ─────►│  Node + Socket.IO  │
   │                    │      (solo modo      │  (autoritativo)    │
   │  Modo Local: usa   │       online)         │  - dueño del bombo │
   │  game-engine       │                       │  - dueño del reloj │
   │  directamente,     │                       │  - valida palabras │
   │  sin red           │                       │    y expresiones   │
   └────────────────────┘                       └────────────────────┘
```

**Principio clave:** en modo online, el cliente nunca decide qué letras/números salen, cuánto tiempo queda, ni si una palabra es válida — solo lo propone; el servidor resuelve usando el mismo `game-engine`. Esto evita trampas (ver la respuesta del rival, manipular el cronómetro) y bugs de sincronización.

## 5. Estructura de Carpetas Propuesta

```
duelo-lexico/
├── AGENTS.md                    ← este documento
├── docs/
│   ├── rules-reference.md       ← reglas exactas del formato original, con fuentes
│   └── dictionary-license.md    ← origen y licencia del listado de palabras
├── package.json                 ← workspaces root
├── pnpm-workspace.yaml
├── packages/
│   └── game-engine/
│       ├── src/
│       │   ├── letters/         ← bag.ts (bombo) + dictionary.ts (validación, wordlist embebido)
│       │   ├── numbers/         ← bag.ts, target.ts, steps.ts, solver.ts
│       │   ├── scoring.ts
│       │   ├── match-state.ts   ← máquina de estados de la partida
│       │   ├── protocol.ts      ← tipos de eventos Socket.IO compartidos web/server
│       │   └── index.ts
│       ├── data/es-words.dict   ← diccionario procesado y comprimido (ver docs/dictionary-license.md)
│       ├── scripts/build-dictionary.mjs
│       └── test/
├── apps/
│   ├── web/                     ← PWA React + Vite
│   │   ├── src/
│   │   │   ├── pages/           ← Home, Local, Online (lobby/sala + partida), Stats
│   │   │   ├── components/      ← Cronómetro, Marcador, LetterBoard, NumberBoard, StepsList, ChoicePicker, OpponentPicker, InviteLink, HomeButton, ConfirmDialog
│   │   │   ├── modes/local/store.ts   ← store Zustand, usa game-engine directo (sin red)
│   │   │   ├── modes/local/stats.ts   ← estadísticas persistentes (IndexedDB via idb)
│   │   │   ├── modes/online/store.ts  ← store Zustand + cliente socket.io (con auto-reconexión)
│   │   │   ├── modes/online/inviteLink.ts ← construir/copiar el enlace ?room=CODIGO
│   │   │   ├── dictionary.ts    ← fetch + setDictionary al arrancar
│   │   │   └── pwa/             ← registro de service worker
│   │   ├── scripts/copy-dictionary.mjs
│   │   └── vite.config.ts
│   └── server/                  ← servidor Socket.IO
│       ├── src/
│       │   ├── rooms/           ← ciclo de vida de sala, matchmaking por código
│       │   ├── match/           ← orquestación de ronda usando game-engine
│       │   ├── dictionary.ts    ← carga el diccionario real al arrancar
│       │   └── index.ts
│       └── test/                ← incluye test de integración end-to-end con sockets reales
└── .github/workflows/           ← CI (lint + test + build) — Fase 2
```

## 6. Motor de Juego (`packages/game-engine`)

**Estado: implementado, con tests y verificado en navegador real** (91 tests, `pnpm --filter @duelo-lexico/game-engine test`). Incluye el diccionario real (§12) y el bot de la CPU (Fase 2, ver §9).

Módulos y responsabilidades:

- **`shuffle.ts`** — utilidad Fisher-Yates compartida con un `RandomFn` inyectable (`() => number`, por defecto `Math.random`), para que los sorteos de letras/números sean deterministas en tests.
- **`letters/bag.ts`** — simula dos bombos independientes (vocales / consonantes), igual que en el programa. El jugador elige nº de vocales (3–6); el resto son consonantes hasta `totalLetters` (10 por defecto). Distribución de frecuencia aproximada al español (ver Decisión de Diseño §9 — la distribución exacta de RTVE no es pública).
- **`letters/dictionary.ts`** — valida longitud mínima (5 letras) y existencia en un diccionario **inyectable** vía `setDictionary({ has, hasPrefix })` — no hay datos reales embebidos todavía (pendiente de §12/§16). `findLongestValidWord` hace una DFS acotada por `hasPrefix` sobre las letras disponibles.
- **`numbers/bag.ts`** — bolsa fija: 2 copias de cada número 1–10 (20 fichas) + 1 copia de cada 25/50/75/100 (4 fichas) = 24 fichas, igual que el formato internacional en que se basa *Cifras y Letras*. El jugador que elige decide cuántos "números grandes" (0–4) quiere.
- **`numbers/target.ts`** — genera el número objetivo (100–999).
- **`numbers/steps.ts`** — valida la prueba de cifras como una **cadena de operaciones encadenadas de dos en dos** (p. ej. `24 × 10 = 240` → `240 − 30 = 210`), no como una expresión con paréntesis (ver Decisión de Diseño §9 — simplificación pedida por el usuario). Cada paso consume dos valores de un "pool" (números originales de la tirada o el resultado de un paso previo) y produce uno nuevo; no hace falta parsear precedencia ni paréntesis. `parseAndValidateSteps` es el punto de entrada (parsea + valida); `stepsToInput`/`stepsToSubmissionString` serializan una cadena de pasos al formato de texto usado en `AnswerSubmitPayload.answer` ("24\*10;240-30").
- **`numbers/solver.ts`** — dado el conjunto de números y el objetivo, calcula el resultado exacto si existe o la mejor aproximación posible (búsqueda recursiva por combinación de pares, memoizada por el multiconjunto de valores restantes para no re-explorar estados equivalentes). Devuelve directamente la cadena de pasos (`ResolvedStep[]`) que produce el resultado — el mismo formato que construye el jugador, así que la solución se muestra con el mismo componente (`StepsList`). Se usa para: (a) el modo CPU en Fase 2, (b) mostrar la solución al final de la ronda, (c) tests — incluido un test que verifica que la cadena de pasos devuelta es realmente válida según `numbers/steps.ts`.
- **`scoring.ts`** — letras: 1 punto por letra de la palabra válida más larga (mínimo 5); cifras: 10 pts resultado exacto, 7 pts mejor aproximación válida; empate reparte puntos a ambos jugadores en ambos casos (ambos reciben el máximo, no se divide). `scoreLettersRound`/`scoreNumbersRound` comparan entre varios jugadores (Online, y Local contra la CPU); `scoreNumbersSolo` es la variante para el modo Local sin rival (ver §9 — bug real corregido).
- **`cpu/bot.ts`** — bot del modo Rival CPU (Fase 2, R4.3): reutiliza `findLongestValidWord`/`solveNumbers` sobre un subconjunto aleatorio de las fichas repartidas (`letterSampleSize`/`numberSampleSize`, mayor cuanto más difícil) más una probabilidad de no responder (`missChance`, decreciente con la dificultad) — sin IA dedicada. Tres dificultades: `easy`/`normal`/`hard` (ver §9).
- **`match-state.ts`** — máquina de estados de la partida completa (fases: elección de letras/cifras → tiempo de respuesta → revelado → puntuación → siguiente ronda → resultado final), agnóstica de si se ejecuta en cliente o servidor. Incluye `createDefaultMatchConfig` (secuencia de rondas alternadas), `createInitialMatchState` y `applyRoundScores` (acumula el marcador ronda a ronda).

## 7. Registro de Requisitos Funcionales

| ID | Requisito | Fase | Estado |
|---|---|---|---|
| R1.1 | Pantalla de inicio con selección de modo: Local (1 jugador) u Online (2 jugadores) | 1 | **Hecho** |
| R1.2 | Configuración de partida: número de rondas letras+cifras, por defecto 5+5 alternadas | 1 | **Hecho** (`createDefaultMatchConfig`, fijo por ahora — sin UI para cambiar el nº de rondas) |
| R1.3 | Marcador visible durante toda la partida con puntos acumulados por jugador/ronda | 1 | **Hecho** (`Marcador.tsx`, probado en local y online con dos pestañas reales) |
| R1.4 | Pantalla de resultado final con ganador y desglose de puntos por ronda | 1 | **Hecho** (vista final dentro de `LocalMatchPage`/`OnlineMatchPage`; no es un `ResultPage` separado — ver §9) |
| R2.1 | Elección de nº de vocales (3–6) para completar las 10 letras del bombo | 1 | **Hecho** — `ChoicePicker.tsx`; en Online alterna quién elige por ronda con cronómetro de 10s y valor por defecto si no elige a tiempo; en Local eliges siempre tú, sin prisa (ver §9) |
| R2.2 | Cronómetro de 30s para escribir la palabra más larga posible | 1 | **Hecho** (`Cronometro.tsx`, deadline absoluto; probado con cuenta atrás real) |
| R2.3 | Validación: mínimo 5 letras + existencia en el diccionario embebido | 1 | **Hecho** — diccionario real de 633.108 palabras (ver §12), probado en el navegador (p. ej. "granate" validada, "argentado" encontrada como mejor palabra) |
| R2.4 | Puntuación = nº de letras de la palabra válida más larga; empate reparte puntos | 1 | **Hecho** (`scoreLettersRound`, verificado end-to-end) |
| R2.5 | Revelado simultáneo de ambas respuestas solo al finalizar el tiempo (online) | 1 | **Hecho** — con una mejora sobre el diseño original: si ambos jugadores ya respondieron, se revela al instante sin esperar el deadline (ver §9) |
| R3.1 | Elección de cuántos números grandes (0–4 de entre 25/50/75/100) se incluyen | 1 | **Hecho** — mismo mecanismo que R2.1, probado en navegador incluidos ambos extremos (0 y 4) y el fallback por tiempo agotado |
| R3.2 | Generación de número objetivo aleatorio (100–999) | 1 | **Hecho** (`numbers/target.ts`) |
| R3.3 | Cronómetro de 40s para encadenar operaciones con los 6 números (sin repetir) | 1 | **Hecho** (`NumberBoard.tsx` — cadena de pasos paso a paso, ver §9) |
| R3.4 | El motor valida cada paso y calcula el resultado final | 1 | **Hecho** (`numbers/steps.ts`), probado en el navegador con cadenas de pasos reales (encadenando hasta 5 pasos) |
| R3.5 | Solver calcula la mejor aproximación posible (para mostrar solución / modo CPU) | 1 | **Hecho** (`numbers/solver.ts`), verificado en partidas reales (encontró soluciones exactas alternativas) |
| R3.6 | Puntuación: 10 pts exacto, 7 pts mejor aproximación; empate reparte puntos | 1 | **Hecho** (`scoreNumbersRound` en Online; `scoreNumbersSolo` en Local — ver §9, bug real corregido) |
| R4.1 | Modo Práctica local: sin rival, estadísticas personales en IndexedDB | 1 | **Hecho** — `modes/local/stats.ts` (vía `idb`), `StatsPage.tsx`; probado en navegador incluyendo persistencia tras recargar la página entera |
| R4.2 | Funcionamiento 100% offline del modo Local (diccionario y solver embebidos) | 1 | **Hecho**: diccionario servido como asset estático precacheado por el service worker (`workbox.globPatterns`/`maximumFileSizeToCacheInBytes` ampliados para sus ~8MB) |
| R4.3 | Modo Rival CPU: bot que usa el propio `game-engine` con dificultad configurable | 2 | **Hecho** — `cpu/bot.ts` (3 dificultades: fácil/normal/difícil), elección de rival antes de empezar (`OpponentPicker`), integrado en `modes/local/store.ts` reutilizando `scoreLettersRound`/`scoreNumbersRound` (multijugador) en vez de las variantes en solitario |
| R5.1 | Creación de sala con código de 6 caracteres + enlace de invitación | 1 | **Hecho** — `?room=CODIGO` autoune directamente, probado abriendo el enlace en una pestaña nueva (salta Home y el formulario, entra ya en la partida). Además de copiar el enlace: botones directos a WhatsApp/Telegram y diálogo nativo de compartir (`navigator.share`) si el navegador lo soporta |
| R5.2 | Sincronización de partida vía Socket.IO con servidor autoritativo | 1 | **Hecho**, con test de integración end-to-end real (`apps/server/test/match-flow.test.ts`) |
| R5.3 | Reconexión con periodo de gracia si un jugador pierde la conexión | 1 | **Hecho** — 3 tests de integración reales (elección pendiente, ronda en curso, token inválido) que además destaparon y arreglaron dos huecos reales (ver §9): el servidor no reenviaba el estado vigente al reconectar, y el cliente nunca usaba el `sessionToken` guardado para reconectar solo. Incluye recuperar la partida al recargar la página entera (`restoreSession`, ver §9 y §10), probado en navegador con `location.reload()` real a mitad de ronda y con un `sessionToken` inválido |
| R5.4 | El servidor es la única fuente de verdad: bombo, objetivo, cronómetro, validación | 1 | **Hecho** y verificado: ambos clientes reciben exactamente el mismo `round:start`, el cliente nunca decide nada por su cuenta |
| R6.x | "Los Duelos": mini-pruebas rápidas con pulsador (3 en 1, Doble Palabra, El Cálculo...) | 2 | Pendiente |
| R7.x | Ronda final temática de 12 palabras + sistema de campeón entre partidas | 3 | Pendiente |

## 8. Requisitos No Funcionales

- **NFR1 — PWA instalable y offline:** manifest + service worker; el modo Local debe funcionar sin conexión alguna.
- **NFR2 — TypeScript estricto** en todo el monorepo, tipos de eventos de socket compartidos vía `game-engine` (o un `packages/protocol` si crece).
- **NFR3 — Accesibilidad básica:** navegación por teclado completa, foco visible, `aria-live` en cronómetro y revelado de resultados.
- **NFR4 — Responsive mobile-first:** uso principal esperado en móvil/tablet, como el programa original.
- **NFR5 — Sin base de datos persistente en el MVP:** estado de sala en memoria del servidor; aceptable para la escala inicial (partidas 1 a 1, sin ranking global).
- **NFR6 — Tema oscuro por defecto**, con opción de tema claro.
- **NFR7 — Resiliencia de red:** el modo online debe tolerar desconexiones breves (móvil) sin perder la partida.

## 9. Registro de Decisiones de Diseño

| Decisión | Alternativas consideradas | Por qué |
|---|---|---|
| Monorepo con pnpm workspaces | npm workspaces, Turborepo | Compartir `game-engine` entre cliente y servidor sin duplicar lógica ni publicar un paquete privado; pnpm es más rápido y estricto que npm; Turborepo se pospone hasta que el build lo justifique |
| React + Vite para el cliente | Next.js, Svelte | Consistencia con proyectos previos del usuario (`concepts-app`); no se necesita SSR; `vite-plugin-pwa` es la integración PWA más madura sobre Vite |
| Socket.IO sobre WebSocket crudo | WebSocket nativo, WebRTC (P2P) | Salas y reconexión automática de fábrica; WebRTC P2P se descarta porque sin servidor autoritativo un jugador podría manipular su propio cliente para hacer trampa |
| Servidor autoritativo (no confiar en el cliente) | Validación solo en cliente | El modo online es competitivo entre dos personas; toda regla decisiva (letras, objetivo, tiempo, validación) debe resolverla el servidor |
| Diccionario embebido estático | Consultar la RAE en vivo (scraping) | La RAE no ofrece API pública de validación programática; depender de red rompería el modo offline (NFR1) y sería frágil/no legal para producción. Se usará un listado de palabras en español de licencia abierta (pendiente de elegir en `docs/dictionary-license.md`, p. ej. derivado de un diccionario Hunspell `es_ES`) |
| Distribución del bombo de letras aproximada, no la exacta de RTVE | Reverse-engineering desde grabaciones del programa | La distribución exacta de letras del bombo oficial no está publicada; se usará una aproximación basada en frecuencia real del español (similar a la usada en el Scrabble en español), parametrizable para ajustar en el futuro |
| Bolsa de números: 2×(1–10) + 1×(25,50,75,100) = 24 fichas | Distribución distinta / inventada | Es la distribución estándar documentada del formato internacional (*Countdown*) del que deriva *Cifras y Letras*; no hay evidencia pública de que el formato español la cambie |
| Zustand para estado del cliente | Redux Toolkit, Context API | Menos boilerplate que Redux; encaja mejor que Context para actualizaciones frecuentes (cronómetro, eventos de socket) sin re-renders innecesarios |
| Nombre de trabajo "Duelo Léxico" | Usar el nombre "Cifras y Letras" | Es marca registrada de RTVE; se evita para no generar un conflicto de marca si el proyecto se publica |
| `oxlint` en vez de ESLint para `apps/web` | ESLint + `typescript-eslint` | Al hacer el scaffold con `npm create vite@latest` (Sep 2026), la plantilla `react-ts` trae `oxlint` por defecto: cero configuración, mucho más rápido (Rust). Se mantiene mientras cubra las necesidades del proyecto; si hace falta una regla que solo tiene el ecosistema ESLint, se reevalúa aquí |
| `workbox-window` como dependencia directa en `apps/web` | Dejar que sea transitiva de `vite-plugin-pwa` | Bajo pnpm (`node_modules` estricto) el build de producción falla si no está declarada explícitamente; se añadió tras reproducir el fallo real (`vite build`) |
| Versiones reales del scaffold: React 19.2, Vite 8, TypeScript 7, Vitest 5 | Fijar versiones antiguas "conocidas" a mano | Se dejó que `npm create vite@latest` y `pnpm add` resolvieran las versiones vigentes en el registro en el momento de crear el proyecto (2026-09-19), en vez de adivinar números de versión que podrían no existir o estar desactualizados |
| `RandomFn` inyectable (`shuffle.ts`, `bag.ts`, `target.ts`) en vez de `Math.random()` fijo | Mockear `Math.random` globalmente en tests | Permite tests deterministas (mismo sorteo con el mismo `rng`) sin tocar el estado global de `Math`; el servidor usará `Math.random` por defecto en producción, sin cambios |
| `dictionary.ts` con interfaz inyectable (`setDictionary`) en vez de esperar a tener el wordlist real | Bloquear todo el motor hasta resolver la licencia del diccionario | Permite implementar y testear `validateWord`/`findLongestValidWord` (con un diccionario falso en tests) sin que la decisión pendiente de §12/§16 bloquee el resto del desarrollo |
| `an-array-of-spanish-words` (MIT) como fuente del diccionario, con `createSortedArrayDictionary` (lista ordenada + búsqueda binaria) | Hunspell `es_ES` + expansión de afijos; trie en memoria | Es un array ya plano (sin expansión de afijos que implementar), licencia MIT clara, ~636k palabras. Lista ordenada es más simple que un trie de objetos JS para 633k palabras y sigue siendo O(log n) |
| Revelado anticipado si ambos jugadores ya respondieron (`handleAnswerSubmit` en `apps/server/src/match/index.ts`) | Esperar siempre al `deadline` completo (30s/40s), como en el programa original | Descubierto escribiendo el test de integración: sin esto, dos jugadores que responden rápido tendrían que esperar el cronómetro completo igualmente. Mejor UX y además hace los tests deterministas sin `vi.useFakeTimers` ni esperas reales de 30-40s |
| Online: quién elige vocales/números grandes alterna por índice de ronda (`playerIds[roundIndex % 2]`) | Elige siempre quien va perdiendo (más fiel al formato original) | Mucho más simple de implementar y de razonar sin necesidad de recalcular tras cada revelado; reparte la elección de forma pareja a lo largo de la partida. Revisar si se quiere la variante "elige el que pierde" en el futuro |
| Fase de elección con cronómetro de 10s (`CHOICE_DURATION_MS`) y valor por defecto si no se elige a tiempo | Bloquear la partida indefinidamente hasta que el jugador en turno elija | Evita que un jugador inactivo (o desconectado) deje colgada la partida del rival; el valor por defecto (4 vocales / 2 números grandes) es el mismo que usaba el MVP antes de tener esta UI. Probado en navegador: el fallback se aplicó correctamente al dejar pasar el tiempo |
| Modo Local: la fase de elección no tiene cronómetro propio | Aplicar el mismo límite de 10s también en solitario | No hay rival al que hacer esperar; meter presión de tiempo a elegir vocales en modo práctica no aporta nada, solo fricción |
| Vista de resultado final integrada dentro de `LocalMatchPage`/`OnlineMatchPage` en vez de un `ResultPage` separado | Usar el `ResultPage.tsx` ya generado en el scaffold inicial | Evita prop-drilling/estado global solo para pasar el resumen de la partida a otra pantalla; `ResultPage.tsx` queda sin usar por ahora (ver backlog) |
| Protocolo de sockets (`protocol.ts`) vive en `packages/game-engine`, no en un `packages/protocol` aparte | Paquete `protocol` independiente (mencionado como opción en NFR2) | Con el tamaño actual del proyecto no se justifica un cuarto paquete; se revisará si el protocolo crece mucho más que las reglas del juego en sí |
| `LetterBoard`/`NumberBoard` (fichas táctiles) sustituyen a `Bombo`+`PalabraInput`/`TecladoCifras` (texto libre) | Mantener un `<input type="text">` para escribir la respuesta | Pedido explícito del usuario: letras/números/operadores en horizontal, se tocan para añadir a la respuesta, tocar una ficha ya puesta la quita (para corregir), tamaño táctil (≥44px). Un input de texto libre no cumple ninguno de estos requisitos |
| `.answerRow` con altura fija (no `min-height`) y `overflow-y: auto` | Altura que crece con el contenido | Bug real encontrado probando en navegador: con altura variable, añadir una ficha desplazaba verticalmente la fila de fichas disponibles de debajo, lo que puede hacer fallar el siguiente toque en móvil si se pulsa rápido. Con altura fija, la fila de fichas nunca se mueve |
| Cifras: cadena de operaciones encadenadas (`numbers/steps.ts`) en vez de una expresión con paréntesis (`numbers/parser.ts`, eliminado) | Mantener el parser de expresiones y añadir botones de paréntesis a `NumberBoard` | Pedido explícito del usuario: operaciones de dos en dos mostradas una debajo de otra (`24 × 10 = 240` → `240 − 30 = 210`), como se resuelve a mano. Efecto colateral bueno: al no necesitar precedencia ni paréntesis, el motor es más simple (sin tokenizador ni parser recursivo) y el solver ya devuelve directamente la misma estructura de pasos que construye el jugador |
| `NumberBoard`: seleccionar número → operador → número calcula y apila el paso al instante (sin botón "confirmar paso") | Un botón explícito de "confirmar" por paso | Coherente con el patrón ya usado en `LetterBoard` (tocar para añadir); un paso inválido (no da entero positivo) se rechaza con un mensaje y dejando los dos números sin consumir, para poder reintentar |
| `AnswerSubmitPayload.answer` para cifras usa el formato de texto `"24*10;240-30"` (pasos separados por `;`) en vez de JSON | Enviar `CalculationStep[]` estructurado por el socket | Mantiene el tipo del payload como `string` sin cambiar el protocolo (igual que letras, que envía la palabra como texto); el parseo es trivial (`parseStepsInput`) al no haber precedencia que resolver |
| Estadísticas en IndexedDB vía `idb` (no `localStorage`) | `localStorage` con JSON serializado a mano | El historial de partidas puede crecer sin límite claro y conviene poder indexar/consultar (p. ej. por fecha); `idb` ya era una dependencia aprobada en el diseño original (§3) pero no se había usado hasta ahora |
| `fake-indexeddb` como devDependency + `clearAllMatches()` exportado para tests | Mockear `idb` a mano en cada test | jsdom no implementa IndexedDB; `fake-indexeddb/auto` en el setup de Vitest lo poliriza igual en todos los tests. `clearAllMatches()` no es solo para tests: sirve de base para un futuro botón "reiniciar estadísticas" |
| `Room.choiceDeadline` como campo propio (no derivarlo del timer) | Calcular el deadline restante a partir de `setTimeout` | `setTimeout` no expone cuánto falta para disparar; guardar el timestamp absoluto permite reenviarlo tal cual a quien se reconecta y es el mismo patrón que ya se usaba para `currentRoundDeadline` |
| `sendCurrentRoundState` en `match/index.ts` en vez de guardar el último payload en `Room` | Cachear el último `round:choosing`/`round:start` emitido en el propio `Room` | Reconstruir el payload a partir del estado real (`pendingChoice`, `roundContexts`, deadlines) evita que se desincronice de lo que se emitió; encontrado y arreglado escribiendo el test de reconexión — sin esto, un jugador que reconectaba a mitad de ronda no sabía qué letras/números estaban en juego |
| Cliente: reconexión automática también tras recargar la página entera, reconstruyendo el estado desde cero con `restoreSession()` (no persistiendo el estado de partida en sí) | Guardar también el estado de partida (ronda, letras/números, marcador) en `localStorage`/`sessionStorage` | Solo se persiste `{roomId, sessionToken}` (ya existía para R5.3); al arrancar la app, si hay sesión guardada se salta directo a `OnlineMatchPage` en fase `connecting`, se crea el socket y su `connect` reemite `room:join` con ese token — el servidor ya reenvía el estado vigente de la ronda (`sendCurrentRoundState`). Reconstruir desde el servidor evita divergencias entre lo guardado en el cliente y la realidad de la partida (p. ej. si la ronda avanzó mientras la pestaña estaba cerrada) |
| `OnlinePhase` añade `'connecting'` (mientras se reintenta `room:join` al recargar) y el manejador de error de `restoreSession` limpia la sesión y pasa a `'disconnected'` con un botón "Volver al inicio" | Reutilizar la fase `'disconnected'` inicial para ambos casos | Sin una fase intermedia, la pantalla quedaba en blanco entre el montaje de `OnlineMatchPage` y la respuesta del servidor; y una sesión inválida (sala ya terminada/expirada) necesita una salida clara en vez de quedarse esperando para siempre |
| Enlace de invitación como `?room=CODIGO` en la URL (no una ruta `/join/CODIGO`) | Ruta dedicada con `react-router` | No hay router en el proyecto (§9 más arriba: pocas pantallas, navegación por estado); un query param se lee con `URLSearchParams` sin dependencias nuevas y se limpia con `history.replaceState` tras consumirlo, para que recargar no reintente unirse |
| `copyInviteLink` devuelve `false` en vez de lanzar si `navigator.clipboard` falla o no existe | Asumir que el portapapeles siempre funciona | Probado en el navegador de pruebas: el permiso de portapapeles estaba denegado y el botón mostró "No se pudo copiar" en vez de romperse — un entorno real de usuario normalmente lo concede tras un clic, pero no hay que asumirlo |
| Compartir: enlaces directos `wa.me`/`t.me` (siempre visibles) + botón `navigator.share` solo si `canShareNatively()` | Depender solo de la Web Share API | `wa.me`/`t.me` funcionan en cualquier navegador sin permisos ni APIs especiales (abren la app si está instalada, o la web si no); la Web Share API cubre "cualquier otra app" pero no está disponible en todos los navegadores de escritorio, así que se muestra como opción adicional, no única |
| Rediseño visual: tokens de color/tipografía/radios/sombras centralizados en `:root` (`index.css`), reutilizados por todos los CSS Modules | Repetir valores sueltos en cada módulo CSS | Pedido explícito del usuario ("aspecto de juego moderno"): un solo sitio para cambiar la paleta o la tipografía sin tocar cada componente. Incluye variante clara (`:root[data-theme='light']`) ya preparada aunque no haya selector de tema todavía |
| Fichas con relieve tipo "tecla" (sombra inferior que se aplana al pulsar) en vez de fichas planas | Fichas planas con solo cambio de color al pulsar | Es el elemento más visible y más tocado del juego; el relieve + la animación de aparición de los chips (`@keyframes pop`) dan la sensación táctil de "juego" que se pidió, verificado interactuando en navegador real |
| `Cronometro` como anillo SVG de progreso que cambia de color (verde → ámbar → rojo) en vez de solo un número | Mantener el cronómetro como texto plano | Encaja con la estética de concurso de habilidad; el color da una señal de urgencia sin tener que leer el número. La duración total se infiere del primer render (no hace falta un prop nuevo), ver `Cronometro.tsx` |
| Clases utilitarias globales `.card`, `.badge`, `.gradient-text`, `button.primary` en `index.css` en vez de repetirlas en cada CSS Module de página | Definir el mismo patrón de tarjeta/insignia en cada `*.module.css` | Todas las pantallas de partida comparten la misma estructura (insignia de ronda, tarjeta de contenido, botón de acción principal); centralizarlo evita siete copias del mismo CSS y mantiene la coherencia visual si cambia el estilo de tarjeta |
| Iconos PWA generados con `sharp` como devDependency temporal (`scripts/generate-icons.mjs`, instalada, ejecutada y desinstalada en el mismo cambio) | Instalar `sharp` de forma permanente; usar un servicio online de conversión SVG→PNG | No hay ninguna herramienta de conversión SVG→PNG disponible en el sistema (`rsvg-convert`, ImageMagick, Inkscape ausentes); `sharp` vía npm es la opción más simple y reproducible, pero como el branding final aún no está decidido (ver §16) no se justifica mantenerla como dependencia permanente — el script queda documentado para volver a ejecutarlo cuando cambie el icono definitivo. El origen (`public/icons/icon-source.svg`) es deliberadamente abstracto y sin texto (dos fichas blancas superpuestas sobre el gradiente de marca) para evitar problemas de renderizado de fuentes al rasterizar |
| Diccionario comprimido con "front coding" a medida (`packages/game-engine/src/letters/dictionary-codec.ts`) en vez de JSON plano | DAWG/trie serializado; gzip/Brotli pre-comprimido + `DecompressionStream` en runtime; simple newline-joined | El listado ya está ordenado (lo exige `createSortedArrayDictionary`), así que palabras consecutivas comparten prefijos largos — front coding aprovecha justo eso con muy poco código (codificar/decodificar es un bucle simple) y sin depender de APIs web recientes como `DecompressionStream` (así funciona igual en Node y en cualquier navegador). Medido contra los datos reales antes de implementarlo: front coding da ~71,6% de reducción (8,29→2,25 MB) frente a solo ~15% de un simple `join('\n')`; un DAWG/trie daría un tamaño similar o algo menor pero es bastante más código y más difícil de depurar para la ganancia extra. 100% reversible — verificado por test (`dictionary-codec.test.ts`) y manualmente contra las 633.108 palabras reales |
| `scoreNumbersSolo(result, target)` nueva y separada de `scoreNumbersRound` para el modo Local | Seguir llamando a `scoreNumbersRound({ [LOCAL_PLAYER_ID]: value }, target)` con un único jugador | **Bug real reportado por el usuario**: en modo Local, `scoreNumbersRound` compara la distancia de cada jugador contra la del resto para decidir quién está "más cerca"; con un solo jugador, esa comparación es trivialmente cierta siempre, así que CUALQUIER respuesta válida (por lejísimos que estuviera del objetivo, p. ej. dos pasos sin encadenar entre sí) puntuaba `APPROX_NUMBER_POINTS` (7 pts) en vez de 0. `scoreNumbersRound` en sí no tenía ningún bug (su contrato siempre fue comparar entre varios jugadores, y así se usa correctamente en Online); el bug era usarla fuera de ese contrato. La solución introduce `MAX_APPROX_DISTANCE` (10, el mismo margen clásico del formato original) como corte absoluto: exacto = 10 pts, a ≤10 del objetivo = 7 pts, más lejos = 0 pts. Verificado con tests (`scoring.test.ts`) y reproduciendo el caso exacto del reporte en navegador (100×2=200 y 6+3=9 sin encadenar, objetivo 471 → antes +7, ahora +0) |
| Bot de la CPU (`cpu/bot.ts`) resuelve con un subconjunto aleatorio de las fichas repartidas (más grande cuanto mayor la dificultad) en vez de una IA dedicada | Heurísticas de "casi-mejor-palabra" a medida; un motor de dificultad basado en un modelo de lenguaje o tabla de frecuencias | Reutiliza el `solver`/`dictionary` ya existentes sin duplicar lógica ni añadir dependencias: `findLongestValidWord`/`solveNumbers` ya encuentran el óptimo dado un conjunto de fichas, así que "jugar peor" es simplemente ver menos fichas (`letterSampleSize`/`numberSampleSize`) y tener una probabilidad de no responder (`missChance`), ambos decrecientes con la dificultad. Barajado con el mismo `shuffle(items, rng)` ya usado en `letters/bag.ts`/`numbers/bag.ts`, con `rng` inyectable para tests deterministas |
| CPU en modo Local reutiliza `scoreLettersRound`/`scoreNumbersRound` (las funciones multijugador ya usadas en Online) pasándole `{ [LOCAL_PLAYER_ID]: ..., [CPU_PLAYER_ID]: ... }`, en vez de comparar el resultado de la CPU aparte con `scoreNumbersSolo` | Puntuar al jugador y a la CPU cada uno por separado con las funciones "solo" | La CPU SÍ es un segundo jugador real con quien comparar distancias/longitudes — exactamente el contrato para el que se diseñaron `scoreLettersRound`/`scoreNumbersRound` (ver fila anterior sobre por qué `scoreNumbersRound` no vale para el modo Solo real, donde no hay ningún segundo jugador). `createInitialMatchState`/`applyRoundScores` ya aceptaban una lista arbitraria de `playerIds`, así que no hizo falta tocar `match-state.ts` |
| Despliegue en Railway: un servicio por app (`server` y `web`) desde el mismo repo monorepo, con Root Directory sin fijar (raíz del repo) y comandos de build/start con `pnpm --filter` | Fijar Root Directory a `apps/server`/`apps/web` por servicio; desplegar `apps/web` en un host estático dedicado (Vercel/Netlify) aparte de Railway | Con Root Directory fijado a la subcarpeta, pnpm no podría resolver `@duelo-lexico/game-engine` (vive fuera de esa carpeta, vía `workspace:*`) — hay que instalar siempre desde la raíz. Un solo proveedor (Railway) simplifica la gestión de un proyecto personal frente a repartir servicios entre dos plataformas, a cambio de no tener el CDN/edge de un host estático dedicado para `apps/web` |
| `apps/web` sirve su build de producción con el paquete `serve` (`"start": "serve -s dist"`) en vez de `vite preview` | Usar `vite preview` también en producción | Vite documenta explícitamente que `preview` no está pensado para servir tráfico de producción. `serve` lee `process.env.PORT` de forma nativa (sin necesitar expansión de variables en el script, que además demostró no ser fiable entre shells: `${PORT:-3000}` se expande bien en `sh` pero no si el script se ejecuta vía `cmd.exe`, como ocurre por defecto en Windows) y por defecto ya hace bind en `0.0.0.0`, necesario para aceptar tráfico entrante en el contenedor de Railway |
| CORS del servidor controlado por `CLIENT_ORIGIN` (env var, con fallback a `'*'` si no está definida) en vez de `origin: '*'` fijo | Dejar `origin: '*'` también en producción | Con `'*'` cualquier origen podría abrir sockets contra el servidor de salas; restringirlo al dominio real de `apps/web` en Railway cierra ese hueco sin romper el desarrollo local (donde `CLIENT_ORIGIN` no se define y se mantiene el `'*'` de siempre) |
| `apps/server` arranca en producción con `tsx src/index.ts` (movido de devDependencies a dependencies) en vez de `node dist/index.js` sobre el build de `tsc` | Compilar tambien `packages/game-engine` a JS y apuntar su `package.json` (`main`/`exports`) al `dist/` compilado | **Bug real** encontrado en el primer despliegue a Railway: `game-engine` expone su `main`/`exports` apuntando directo a `src/index.ts` (funciona con `tsx`/`vite`/`vitest`, que transpilan TS al vuelo); pero `node dist/index.js` de `apps/server` es Node puro, y al resolver `@duelo-lexico/game-engine` intenta cargar ese `.ts` sin loader → `ERR_UNKNOWN_FILE_EXTENSION`. Compilar `game-engine` aparte y cambiar sus exports habría funcionado pero añade un paso de build cruzado entre paquetes y dos formas distintas de consumir el mismo código (fuente en dev, compilado en producción) a mantener sincronizadas. Usar `tsx` también en producción es el cambio mínimo: ya se usaba en `dev` (`tsx watch src/index.ts`) con el mismo resultado. `pnpm --filter server build` (`tsc`) se mantiene como paso de build en Railway solo como gate de tipos antes de desplegar, aunque su `dist/` ya no se ejecute |
| Botón "← Inicio" (`HomeButton.tsx`) reutilizable en cada pantalla de partida, con confirmación (`ConfirmDialog.tsx`) solo cuando `confirmExit` está activo | Un único `history.back()`/breadcrumb genérico; confirmar siempre al salir, incluso sin partida en curso | Pedido explícito del usuario: todas las pantallas necesitan una forma de volver, pero solo avisar de pérdida de progreso cuando "se está en pleno juego". `confirmExit` se activa en las fases `choosing`/`answering`/`reveal` de `LocalMatchPage` y `OnlineMatchPage` (donde ya hay una ronda en marcha), no en `OpponentPicker`, `OnlineLobbyPage` ni en `waiting-for-opponent` (nada que perder todavía). En Online, `onBeforeExit={leaveRoom}` asegura que salir desconecta el socket correctamente y avisa al rival (`player:disconnected`) en vez de dejar que expire por timeout |
| `workbox.skipWaiting`/`clientsClaim` explícitos en `vite.config.ts` (antes solo `registerType: 'autoUpdate'`) | Pedir al usuario que borre caché/haga hard-refresh tras cada despliegue | Tras el despliegue del HomeButton, un usuario reportó no ver los botones nuevos en varios navegadores. Diagnóstico: el servidor SÍ servía el build correcto (verificado con `curl`, sin caché de por medio, y comprobando que el bundle contenía literalmente el texto de `HomeButton`/`ConfirmDialog`); el problema era el propio Service Worker de la PWA — cualquier navegador que ya hubiera visitado la URL antes sirve la versión vieja cacheada en la primera carga tras un despliegue (comportamiento inherente a cualquier service worker), y solo se actualiza sola en segundo plano unos segundos después. `skipWaiting`+`clientsClaim` no eliminan esa primera carga obligatoriamente vieja, pero minimizan cuánto tarda el nuevo SW en tomar el control y disparar el auto-reload de `autoUpdate`, reduciendo la ventana en la que un usuario podría ver la versión anterior |

**Ciclo de vida de una sala:**
1. Jugador A crea sala → servidor genera código de 6 caracteres → A comparte el código con Jugador B.
2. B se une con el código → servidor empareja y notifica a ambos → comienza la partida.
3. Cada ronda empieza con una **fase de elección**: el servidor decide a quién le toca elegir (alterna por índice de ronda) y emite `round:choosing` con `min`/`max` y un `deadline` de 10s (`CHOICE_DURATION_MS`); el jugador en turno emite `choice:submit`, o si no llega a tiempo el servidor aplica un valor por defecto (4 vocales / 2 números grandes).
4. Resuelta la elección, el servidor decide (usando `game-engine`) el bombo/números, emite `round:start` con un `deadline` (timestamp absoluto, no una cuenta atrás relativa) para que el cliente calcule el tiempo restante sin depender de la latencia.
5. Cada cliente envía su respuesta (`answer:submit`) en cualquier momento antes del `deadline`; el servidor la guarda pero **no la reenvía al rival** hasta que el tiempo expira (evita ver la respuesta ajena en directo, igual que en el programa). Si ambos responden antes, revela al instante sin esperar el resto del `deadline`.
6. Al expirar el `deadline` (o al responder los dos), el servidor valida ambas respuestas con `game-engine`, calcula puntuación, emite `round:reveal` con ambas respuestas y el desglose de puntos.
7. Se repite desde el paso 3 hasta completar el nº de rondas configurado → `match:end` con resultado final.

**Reconexión:** cada jugador guarda `{ roomId, sessionToken }` en `localStorage`. Socket.IO reconecta el *socket* solo tras un corte de red, pero el servidor ve una conexión nueva (sin `roomId`/`playerId` asociados); el listener `connect` del store online (`modes/online/store.ts`) detecta que ya había una sala activa y reemite `room:join` con el `sessionToken` guardado para retomarla. El servidor mantiene el estado de la sala en memoria durante `RECONNECT_GRACE_MS` (30s) antes de darla por abandonada, y al reconectar (`sendCurrentRoundState` en `apps/server/src/match/index.ts`) reenvía solo a ese socket el `round:choosing` o `round:start` vigente — sin esto, quien reconectaba se quedaba sin saber qué letras/números estaban en juego.

**Recargar la página entera** también recupera la partida: `App.tsx` comprueba `hasPersistedSession()` al arrancar (antes de que el usuario toque nada) y, si hay una sesión guardada, entra directo en `OnlineMatchPage` y llama a `restoreSession()`, que pone `roomId`/fase `'connecting'` y crea el socket; el mismo listener `connect` de arriba hace el resto. No se persiste el estado de la partida en sí (ronda, letras, marcador) — se reconstruye siempre desde el servidor vía `sendCurrentRoundState`, así nunca diverge de lo que realmente está pasando en la sala. Si el `sessionToken` ya no es válido (sala terminada o expirada tras los 30s de gracia), se limpia la sesión guardada y se muestra una pantalla de error con un botón para volver al inicio, en vez de dejar la app colgada.

**Sincronización de reloj:** al conectar, cliente y servidor hacen un intercambio simple tipo ping/pong para estimar el desfase de reloj y corregir el cálculo del tiempo restante mostrado en la UI.

## 11. Modo Local (1 jugador)

**Estado: implementado y probado en navegador** (`apps/web/src/modes/local/store.ts`).

- **Práctica (MVP):** el jugador juega rondas de letras/cifras contra el reloj, sin rival. Al responder (o agotar el tiempo) se revela al instante: puntos ganados, y la mejor palabra/cadena de pasos posible (vía `findLongestValidWord`/`solveNumbers`). Al terminar la partida (`continueToNextRound` cuando ya no quedan rondas), `modes/local/stats.ts` guarda el resumen en IndexedDB (base `duelo-lexico-stats`, vía `idb`) — sobrevive a recargar la página, probado en navegador. `StatsPage.tsx` (accesible desde Home y desde la pantalla de "Partida terminada") muestra agregados: partidas jugadas, mejor puntuación, media, mejor palabra, nº de cifras exactas acertadas.
- **Rival CPU (Fase 2):** **Hecho.** Un "bot" (`packages/game-engine/src/cpu/bot.ts`) que reutiliza el propio `solver`/`dictionary` de `game-engine` en vez de una IA compleja: solo "ve" un subconjunto aleatorio de las fichas repartidas (mayor cuanto más difícil) y resuelve con eso lo mejor que puede, además de una probabilidad de no responder nada (`missChance`, también decreciente con la dificultad). Tres niveles (`easy`/`normal`/`hard`), elegidos en `OpponentPicker` antes de empezar la partida; `modes/local/store.ts` arranca la partida con dos "jugadores" (`LOCAL_PLAYER_ID`, `CPU_PLAYER_ID`) y usa `scoreLettersRound`/`scoreNumbersRound` (las mismas que Online) en vez de `scoreNumbersSolo`. Verificado en navegador: partida completa de 10 rondas contra la CPU en difícil, marcador final y pantalla de "Ha ganado la CPU"/"Empate"/"¡Has ganado!" correctos, y el modo Solo (sin rival) sigue funcionando igual que antes.
- Funciona **sin conexión**: el diccionario y el solver viven enteramente en el cliente; verificado sirviendo el binario del diccionario como asset estático precacheado por el service worker.

## 12. Diccionario y Validación de Palabras

**Estado: resuelto.** Ver `docs/dictionary-license.md` para la ficha completa (fuente, licencia MIT reproducida íntegra, procesado, formato de compresión y cómo se usa en runtime).

- Fuente: [`an-array-of-spanish-words`](https://github.com/words/an-array-of-spanish-words) (MIT, ~636.000 palabras, derivado de la *Letterpress word list*).
- Reproducible con `pnpm --filter @duelo-lexico/game-engine build:dictionary` (`packages/game-engine/scripts/build-dictionary.mjs`) → genera `packages/game-engine/data/es-words.dict` (633.108 palabras, longitud ≥ 5, solo `a-z`+`ñ`, ordenadas, comprimidas con "front coding" — ver §9).
- Estructura elegida en runtime: **lista ordenada + búsqueda binaria** (`createSortedArrayDictionary` en `letters/dictionary.ts`), no un trie en memoria — más simple y suficientemente rápido (O(log n)). El binario se decodifica a esa lista una vez al arrancar (`decodeFrontCoded`).
- El servidor lee el binario vía el subpath `@duelo-lexico/game-engine/dictionary-data` (declarado en el `exports` del `package.json` del motor, resuelto con `require.resolve` + `fs.readFileSync`); el cliente lo sirve como asset estático (`apps/web/public/dictionary/es-words.dict`, copiado por `scripts/copy-dictionary.mjs` antes de `dev`/`build`) y lo carga con `fetch()` + `arrayBuffer()` al arrancar la app.
- **No** se depende de una consulta en vivo a `dle.rae.es` — sin API pública, rompería el modo offline.
- Tamaño: 2,25 MB comprimido (antes 7,9 MB sin comprimir) — ver §9 y §15 (resuelto).

## 13. Comandos

El proyecto es jugable de extremo a extremo: `pnpm dev:web` + `pnpm dev:server` en paralelo dan una partida real (modo Local funciona sin arrancar el servidor). Verificado manualmente en navegador: partida Local completa (letras + cifras) y partida Online completa con dos pestañas (crear sala, unirse, 10 rondas, resultado final).

Cobertura de test actual: 132 tests (91 en `game-engine` — incluye el codec de compresión del diccionario, `scoreNumbersSolo` y el bot de la CPU —, 7 de integración real con sockets en `apps/server` — elección por turnos, reconexión —, 34 en `apps/web` — `LetterBoard`/`NumberBoard`, `modes/local/stats.ts` con `fake-indexeddb`, `modes/online/inviteLink.ts` con el portapapeles y `navigator.share` simulados).

```bash
pnpm install                  # instala todo el monorepo
pnpm dev:web                  # arranca la PWA en local (apps/web) - copia el diccionario primero
pnpm dev:server               # arranca el servidor Socket.IO en local (apps/server)
pnpm --filter @duelo-lexico/game-engine build:dictionary   # regenera data/es-words.dict desde la fuente
pnpm -r test                  # tests en todos los paquetes (132 tests: motor + integracion de servidor + web)
pnpm -r typecheck
pnpm -r lint                  # solo apps/web tiene lint (oxlint) por ahora
pnpm -r build
```

## 14. Reglas para Agentes

1. Leer este documento y `docs/rules-reference.md` antes de tocar código.
2. Cualquier cambio en las reglas del juego se implementa primero en `packages/game-engine` con tests unitarios — nunca directamente en la UI ni en el servidor.
3. El cliente nunca es la autoridad final en modo online: toda validación decisiva pasa por el servidor usando `game-engine`.
4. Mantener actualizada la tabla de Requisitos Funcionales (§7) y la de Decisiones de Diseño (§9) al añadir o cambiar algo relevante.
5. No añadir dependencias fuera de las aprobadas en §3 sin justificarlo primero en §9.
6. Todo cambio visual/UX relevante se describe en el PR (y se captura con screenshot si aplica).
7. Commits en inglés, formato convencional, referenciando el ID de requisito cerrado en el footer.
8. No romper el funcionamiento offline del modo Local (NFR1): ninguna llamada de red obligatoria en ese flujo.
9. Cualquier dato/lista externa (diccionario, distribución de letras) documenta su fuente y licencia en `docs/`.
10. No usar nombre, logo o assets oficiales de RTVE en el proyecto (ver nota de marca al inicio).

## 15. Backlog

**Fase 1 (MVP) — completa.** Motor de reglas (§6), diccionario real (§12), elección de vocales/números grandes (R2.1/R3.1, con alternancia de turno online), estadísticas persistentes en IndexedDB (R4.1), enlace de invitación (R5.1), reconexión con periodo de gracia incluyendo recarga completa de página (R5.3, ver §9/§10), rediseño visual (tokens de color/tipografía, fichas con relieve, cronómetro circular, tarjetas), iconos PWA instalables (192/512/maskable, ver §9), modo Local jugable de extremo a extremo, modo Online jugable de extremo a extremo (probado con dos pestañas reales, partida completa de 10 rondas, incluida la fase de elección, su fallback por tiempo agotado y la recuperación de sesión tras `location.reload()` a mitad de ronda). No quedan pendientes conocidos de Fase 1; el branding final sigue abierto (ver §16).

**Fase 2:** R6.x (Duelos), sonido/animaciones, CI (lint+test+build).
- ~~R4.3 (rival CPU)~~ — **Hecho**: ver §9 (`cpu/bot.ts`) y §12 arriba.
- ~~Comprimir el diccionario~~ — **Hecho**: formato binario "front coding" (`dictionary-codec.ts`), 8,29 MB → 2,25 MB (~71,6% menos); precache total de la PWA de ~8,47 MB a ~2,66 MB. Ver §9 y `docs/dictionary-license.md`.
**Fase 3:** R7.x (ronda final temática), sistema de campeón multi-partida, backend persistente si se quiere ranking global, posible soporte de salas con espectadores.

## 16. Preguntas Abiertas / Riesgos

- **Distribución exacta del bombo de letras:** RTVE no la publica; validar por playtesting si la aproximación por frecuencia del español da partidas "justas".
- **Nombre y branding final** del proyecto — pendiente de decisión del usuario, evitando la marca de RTVE.
- ~~**Hosting del servidor Socket.IO**~~ — **Resuelto:** Railway, un servicio por app (`server` y `web`) desde el mismo repo. Ver §9 (decisiones de despliegue) y el README.
- ~~**Tamaño del diccionario (~7,9MB)**~~ — **Resuelto:** comprimido a ~2,25MB con "front coding", ver §9/§12.
