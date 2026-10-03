# Architecture — the main pieces and how they fit.

React SPA (Vite) → React context providers → `ActivationGate` (Supabase licence
check) → `App` shell → chart components (`lightweight-charts`) → OpenAlgo gateway
over REST + WebSocket.

## Components
- `src/main.tsx` — boot: theme, forced host/WS localStorage seeds, provider tree,
  `ActivationGate` wrapping `App`. Entry: the root render block in `src/main.tsx`.
- `src/services/activation/` — licence/trial gate (see [[features/activation-licensing]]).
- `src/context/` — Theme, User, UI, Tool, Alert and Watchlist providers.
- `src/components/` — UI: Chart, Topbar, OptionChain, Activation, …
- `src/services/` — API/mock/alert data services (`src/services/mockDataService.ts#isDemoMode`
  drives the LIVE/DEMO toggle via `?demo=true` or the persisted choice).
- `src/utils/indicators/` — indicator maths (sma, ema, rsi, macd, supertrend, …).
- `src-tauri/` — Tauri desktop shell; `activator/` — separate Flutter activator app.

## Data / control flow
- boot → seed `oa_host_url`/`oa_ws_url` → ActivationGate resolves Supabase access →
  app renders → authenticate to the gateway → REST `/api` history + WS `/ws` ticks
  (proxied in dev by `vite.config.ts` `server.proxy`) → charts/indicators/alerts.

See [[overview]] for how to run; [[conventions]] for structure rules.
