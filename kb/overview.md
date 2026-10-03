# Overview — what this project is and how to run it.

Open Chart (`open-chart`, v1.0.5) — a React 19 + Vite + `lightweight-charts`
trading/charting app, also packaged as a Windows desktop app via Tauri. Features:
multi-chart layouts, option-chain / multi-leg strategy charts, ~20 indicators,
drawing tools, watchlists and price alerts. Market data comes from an
OpenAlgo-compatible gateway; the app ships pre-pointed at the "Quantonomous
Router" (REST `127.0.0.1:1100`, WS `127.0.0.1:1200`) — see [[features/activation-licensing]].

## Key entry points
- `src/main.tsx` — Vite entry: seeds the host/WS localStorage values, then renders `<App/>` wrapped in `ActivationGate`. Entry: `src/main.tsx` (root render block).
- `src/App.tsx` — the chart application shell (auth, layout, data wiring).
- `src/components/Activation/ActivationGate.tsx#ActivationGate` — first-run licence/trial gate; blocks the whole app until Supabase grants access.

## How to run
- `npm.cmd install` (first time) then `npm.cmd run dev` → http://localhost:5173/
- Use **`npm.cmd`**: `npm.ps1` is blocked by the PowerShell execution policy on this machine.

See [[cheatsheet]] for the other scripts and [[features/activation-licensing]] for the
licensing backend the app needs alive before it will start.
