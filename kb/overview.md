# Overview — what this project is and how to run it.

**Open Chart** (`open-chart`, v1.0.5) is a trading/charting desktop-class web app:
React + TypeScript + Vite in the browser, and the same build wrapped by **Tauri 2**
into a Windows desktop app. It renders market data with `lightweight-charts` and
talks to an **OpenAlgo-compatible gateway** for candles, ticks, orders and
options. Branding/publisher is Quantonomous. Entry `index.html` (title "Open Chart")
→ `src/main.tsx`.

## Key entry points
- `index.html` — the only HTML page; loads `/src/main.tsx`.
- `src/main.tsx` — boot: applies the saved theme, force-seeds the router
  localStorage values, mounts the provider tree, then `ActivationGate` → `App`.
- `src/App.tsx` — the application shell (~2.5k lines): auth, layout, WebSocket
  wiring, modals, and the `use*Handlers` hook fan-out.
- `src/components/Activation/ActivationGate.tsx#ActivationGate` — the licence/trial
  gate that wraps the whole app; nothing renders until it grants access.
- `src/components/Chart/ChartComponent.tsx` and `.../ChartGrid.tsx` — the chart pane
  and the 1–4 pane grid.
- `src/services/api/config.ts#getApiBase` / `#getWebSocketUrl` — where the backend
  URL comes from.
- `src-tauri/tauri.conf.json` — desktop shell (identifier `in.quantonomous.openchart`).

## How to run
- `npm.cmd run dev` → Vite on **http://localhost:5173/**
- `npm.cmd install` first time; `npm.cmd run build` for `tsc -b && vite build`.
- Use **`npm.cmd`**, not `npm`: `npm.ps1` is blocked by the PowerShell execution
  policy on this machine.
- The app needs a **live licensing backend** (Supabase) and a **reachable gateway**
  before it shows charts — see [[features/activation-licensing]] and
  [[features/market-data]].

## Scripts
`dev`, `build`, `preview`, `lint`, `lint:fix`, `type-check`, `test` (vitest),
`test:coverage`, `test:e2e` (Playwright), `tauri` — all in `package.json`.

## Shape of the repo
- `src/` — the whole front end (~378 files): `components/`, `hooks/`, `services/`,
  `store/`, `plugins/`, `utils/`, `types/`, `context/`.
- `src-tauri/` — Tauri desktop shell; `installer/` — Inno Setup script.
- `supabase/migrations/` — the licensing SQL.
- `activator/activator/` — a **separate** Flutter scaffold app, not part of the web build.
- `docs/` — architecture, plans, testing and audit write-ups; the root `*.md`
  status files (e.g. `ALERT_SYSTEM_STATUS.md`, `WHY_ALERTS_NOT_TRIGGERING.md`) are
  point-in-time investigation notes, not current documentation.
- `e2e/`, `tests/`, `src/__tests__/` — see [[features/testing]].

See [[architecture]] for the pieces, [[cheatsheet]] for commands, [[gotchas]] for traps.
