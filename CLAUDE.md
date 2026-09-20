# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Duelo Léxico ("Cifras y Letras" is RTVE's trademark and must not be used in code, UI, or docs — see AGENTS.md §16) is a PWA word/number puzzle game with a solo Local practice mode (optionally vs. a CPU bot) and a real-time Online 2-player mode.

**`AGENTS.md` at the repo root is the living design doc** — requirements table, full decision log with rationale, game rules, backlog, and current test counts. Read it (or the relevant section) before making non-trivial changes; update it (requirements/decisions/backlog/test count) after implementing a feature, matching its existing style. `docs/dictionary-license.md` documents the embedded dictionary's source, license, and binary format in detail.

## Commands

```bash
pnpm install                  # install the whole monorepo (Node >= 20, pnpm)

pnpm dev:web                  # PWA dev server at http://localhost:5173 (copies the dictionary first)
pnpm dev:server               # Socket.IO server at http://localhost:3001

pnpm -r typecheck             # typecheck all packages
pnpm -r test                  # run all tests (vitest, all packages)
pnpm -r lint                  # oxlint (apps/web only — the only package with a lint script)
pnpm -r build                 # production build of all packages

pnpm --filter @duelo-lexico/game-engine build:dictionary   # regenerate data/es-words.dict from source
```

Run a single test file directly with vitest from inside the package:
```bash
cd packages/game-engine && npx vitest run test/cpu/bot.test.ts
cd apps/web && npx vitest run src/modes/online/inviteLink.test.ts
cd apps/server && npx vitest run test/match-flow.test.ts
```

`pnpm --filter web build` / `pnpm --filter web preview` build/serve the production PWA bundle (useful for checking the service worker's precache list and manifest).

## Architecture

Three-package pnpm workspace (`apps/*`, `packages/*`):

- **`packages/game-engine`** — pure TypeScript, no framework or I/O dependencies. All game rules live here and are imported directly by both `apps/web` (client-side, Local mode) and `apps/server` (authoritative, Online mode), so the rules can never diverge between the two runtimes. Key modules: `letters/bag.ts` + `letters/dictionary.ts` (+ `letters/dictionary-codec.ts`), `numbers/bag.ts` + `numbers/target.ts` + `numbers/steps.ts` + `numbers/solver.ts`, `scoring.ts`, `match-state.ts` (phase machine, framework-agnostic), `protocol.ts` (shared Socket.IO event types), `cpu/bot.ts`. Randomness (`shuffle.ts`, letter/number draws) takes an injectable `RandomFn = () => number` (default `Math.random`) so tests are deterministic.
- **`apps/web`** — React 19 + Vite 8 + Zustand 5 PWA (`vite-plugin-pwa`/Workbox). No router: `App.tsx` is a manual screen switch (`Screen` union), since the app only has a handful of top-level views. `modes/local/store.ts` runs the whole match client-side using `game-engine` directly (works offline). `modes/online/store.ts` is a thin reflection of server-pushed Socket.IO events — the client never decides game state itself.
- **`apps/server`** — Node + Socket.IO 4.8. Authoritative for Online mode: the server alone decides letters/numbers, the target, deadlines, and validity; clients only emit intent (`choice:submit`, `answer:submit`) and receive results. Room/session state lives in memory (`rooms/index.ts`), round orchestration in `match/index.ts`.

### Online protocol & reconnection

Event flow per round: `round:choosing` (server picks whose turn to choose, 10s deadline, default applied if it lapses) → `choice:submit` → `round:start` (absolute deadline timestamp, not a countdown, so clients aren't affected by latency) → `answer:submit` (revealed only once both players have answered or the deadline passes — early reveal if both answer first) → `round:reveal` → repeat → `match:end`.

Each client persists `{ roomId, sessionToken }` to `localStorage`. Socket.IO auto-reconnects the *socket* after a network blip, but the server sees a fresh connection with no room association — the client's `connect` handler re-emits `room:join` with the saved token, and the server (`sendCurrentRoundState`) resends whatever round is currently live so the reconnecting client isn't stuck. This also covers a full page reload: the app checks for a persisted session on boot and jumps straight into `OnlineMatchPage` in a `connecting` phase before the socket even connects.

### Dictionary

`packages/game-engine/data/es-words.dict` (633k Spanish words, MIT-licensed source, ≥5 letters, no accents) is stored in a custom binary "front coding" format (`letters/dictionary-codec.ts`): since the sorted word list has long shared prefixes between consecutive entries, each word is stored as (shared-prefix-length byte, changed suffix) instead of repeating the prefix — ~72% smaller than the equivalent JSON. Both the server (`fs.readFileSync` + `require.resolve` on the package's `dictionary-data` export) and the web client (`fetch` + `arrayBuffer`, precached by the service worker for offline play) decode it once at startup via `decodeFrontCoded` into a plain sorted array, then wrap it with `createSortedArrayDictionary` (binary search) and `setDictionary`. Regenerate it with `pnpm --filter @duelo-lexico/game-engine build:dictionary` if the source word list changes.

### CPU bot

`cpu/bot.ts` avoids a dedicated AI: it reuses `findLongestValidWord`/`solveNumbers` but only lets the bot "see" a random subset of the dealt tiles (size scales with difficulty), plus a per-round chance to not answer at all (also scales with difficulty). Local-mode matches against the CPU score with the same multiplayer `scoreLettersRound`/`scoreNumbersRound` functions Online mode uses (the CPU is a real second "player" in `MatchState.scores`) — solo practice with no opponent uses `scoreNumbersSolo` instead, since the multiplayer scorers degenerate to "always at least 7 points" with only one entrant (see AGENTS.md §9 for the bug this caused and the fix).

## Conventions and gotchas

- **TypeScript strictness varies per package** and isn't uniform: the shared `tsconfig.base.json` sets `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; `apps/web/tsconfig.app.json` is the Vite template's own config (not extending the base) and additionally sets `erasableSyntaxOnly` (rejects TS parameter-property constructor shorthand) and `verbatimModuleSyntax`. `packages/game-engine/tsconfig.json` adds `"lib": ["ES2022", "DOM"]` on top of the base solely so `TextEncoder`/`TextDecoder` (used by the dictionary codec) type-check — the package has no other DOM dependency and must stay usable from Node. Since `game-engine`'s `main`/`exports` point at `.ts` source (not compiled output), its files get type-checked under whichever consumer's tsconfig is active.
- **Tests favor real integration over mocking.** `apps/server/test/match-flow.test.ts` runs a real Socket.IO server and real client sockets rather than mocking the transport. `apps/web` avoids mocking the online store's socket entirely — that logic is instead verified by running the real dev servers and driving them with a browser. Prefer this pattern for new online/local-mode features: unit-test the pure `game-engine` logic, integration-test sockets for real, and browser-verify UI flows.
- For dictionary-related unit tests in `game-engine`, use the `createFakeDictionary(words)` + `setDictionary()` pattern already present in `test/letters/*.test.ts` rather than loading the real 633k-word dictionary.
