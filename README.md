# FocusEngine

A drift-free Study Chronograph & Task Execution Engine. Next.js 15 (App
Router) + TypeScript + Tailwind + Zustand, built to survive backgrounded
tabs, page reloads, and offline sessions without losing a millisecond.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Everything (timer, tasks, ambient audio) runs
entirely client-side and offline once the page has loaded — there is no
backend and no external asset fetch.

```bash
npm run build   # production build (lint + typecheck + build)
npm run start   # serve the production build
npm run typecheck
npm run lint
```

## Architecture

- **`public/timer-worker.js`** — a dedicated Web Worker that ticks at 10Hz
  and reports wall-clock `Date.now()` on every tick. The main thread never
  trusts elapsed-tick counts (which drift when a tab is throttled); it only
  ever computes `elapsed = now - segmentStartedAt` from the reported
  timestamp, so accuracy holds over multi-hour backgrounded sessions.
- **`lib/store/useTimerStore.ts`** — persisted (localStorage) Zustand store
  holding the canonical session state: mode, status, accumulated ms, laps,
  Pomodoro config/phase, daily study minutes, and streak. On rehydration,
  a dangling "running" session left over from a closed tab is converted to
  a paused, correctly-accumulated segment using the current wall clock —
  reloads never lose or double-count time.
- **`lib/store/useClockStore.ts`** — a separate, *unpersisted* store that
  just republishes the worker's `now`. Keeping this out of the persisted
  timer store avoids writing the full session to localStorage on every
  100ms tick.
- **`lib/store/useTaskStore.ts`** — persisted task list, following the
  `Task` contract in `lib/types.ts` exactly as specified, including
  `lapBreakdowns` capture when a focused task is marked done.
- **`lib/audio/audioEngine.ts`** — zero-asset procedural audio via
  `AudioContext`: Paul Kellett pink noise, integrated brown noise, a
  layered detuned-oscillator focus drone, and a synthesized major-triad
  completion chime. No `<audio>` tags, no MP3/WAV files.
- **`hooks/useKeyboardShortcuts.ts`** — global `Space` / `S` / `R` / `⌘K` /
  `?` handling, ignored while typing in a form field.
- **`components/CommandPalette.tsx`** — `cmdk`-based palette for mode
  switching, task search/focus, and ambient sound control.

## Verification

This build has been verified in-sandbox: `npm run typecheck` (strict mode,
`noUncheckedIndexedAccess`), `npm run lint` (flat ESLint config, Next.js
core-web-vitals + TypeScript rules), and `npm run build` all pass with zero
errors and zero warnings, and the production server was smoke-tested to
confirm the page and `/timer-worker.js` both serve correctly.
