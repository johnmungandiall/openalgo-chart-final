# Architecture — the main pieces and how they fit.

Browser/Tauri SPA → provider tree → `ActivationGate` (Supabase licence) → `App`
shell → chart panes (`lightweight-charts` + plugins) → OpenAlgo gateway over REST
+ WebSocket. Shared state lives in zustand stores; per-feature logic lives in
`src/hooks/use*Handlers.ts` rather than in the components.

## Boot
`index.html` → `src/main.tsx`:
1. apply `tv_theme` to `<html>` before render (no theme flash);
2. force-seed `oa_host_url=http://127.0.0.1:1100` and `oa_ws_url=ws://127.0.0.1:1200`
   (the Quantonomous Router), so the connect dialog never appears;
3. seed `oa_apikey` from `VITE_OPENALGO_API_KEY` **only in dev** — production
   builds deliberately ignore it so no broker key ships in the binary;
4. render `ErrorBoundary → UserProvider → ThemeProvider → UIProvider → ToolProvider
   → AlertProvider → WatchlistProvider → ActivationGate → App`.
`OrderProvider` is mounted inside `App.tsx`, not in `main.tsx`.

## Front-end layers
- `src/context/` — React contexts: `ThemeContext`, `UIContext`, `UserContext`,
  `ToolContext`, `AlertContext`, `OrderContext`, `WatchlistContext`
  (barrel: `src/context/index.ts`).
- `src/store/` — zustand state: `workspaceStore.ts` (layout, charts, indicators;
  `persist` under `openalgo-workspace-storage`, with `migrate` + `setFromCloud`)
  and `marketDataStore.ts` (`TickerData`, selectors `selectTicker` / `selectLTP`).
- `src/hooks/` — 36 hooks; the big ones are the `use*Handlers` family
  (`useChartHandlers`-style modules: symbol, interval, layout, alert, indicator,
  tool, UI, order, watchlist) plus `useChart`, `useIndicatorWorker`,
  `useTradingData`, `useCloudWorkspaceSync`, `useGlobalShortcuts`.
- `src/components/` — `Layout`, `Topbar`, `Chart`, `Watchlist`, `Toolbar`,
  `AccountPanel`, `OptionChainPicker`/`OptionChainModal`, `PositionTracker`,
  `RiskCalculatorPanel`, `ANNScanner`, `MarketScreener`, `SectorHeatmap`,
  `Replay`, `Settings`, `CommandPalette`, `shared/`.
- `src/plugins/` — custom `lightweight-charts` series primitives and the drawing
  engine: `line-tools/` (trend lines, shapes, fibonacci, text…), `tpo-profile/`,
  `volume-profile/`, `delta-profile/`, `footprint-chart/`, `oi-profile/`,
  `power-trades/`, `bar-stats/`, `visual-trading/`, `risk-calculator/`.
  Base class: `src/plugins/plugin-base.ts`. See [[features/chart-engine]].
- `src/utils/` — pure helpers; `utils/indicators/` holds the indicator maths and
  `utils/workers/indicatorWorker.ts` runs heavy calcs off the main thread.
- `src/types/` — domain types (`src/types/domain/chart.ts#ChartType`,
  `#TimeInterval`, `#IndicatorType`; `src/types/api/*`).

## Data / control flow
1. `ActivationGate` resolves licence/trial access against Supabase
   ([[features/activation-licensing]]).
2. `App.tsx` checks auth (`checkAuth`) — with no API key it shows
   `ApiKeyDialog` instead of charts (`isDemoMode()` bypasses this).
3. REST goes through `src/services/api/client.ts#makeApiRequest` (POST, `apikey`
   in the body, unwraps the `{status:'success', data}` envelope) using the base
   from `src/services/api/config.ts#getApiBase`; WebSockets via
   `#getWebSocketUrl`.
4. `src/services/openalgo.ts` is a back-compat barrel re-exporting the split
   services (`chartDataService`, `optionsApiService`, `instrumentService`,
   `preferencesService`, `drawingsService`, `trading/account.service`,
   `orderService`) — new code should import the specific service.
5. `src/services/globalAlertMonitor.ts#GlobalAlertMonitor` (singleton
   `globalAlertMonitor`) polls/streams prices, evaluates stored alerts and fires
   webhooks via `webhookService`. See [[features/market-data]].
6. Dev proxying is in `vite.config.ts#proxy`: `/api` → `OPENALGO_API_TARGET`
   (default `http://127.0.0.1:5001`), `/ws` → `ws://127.0.0.1:8765`,
   `/npl-time` → nplindia.in (used by `src/services/timeService.ts`).

## Delivery surfaces
- Web: `npm.cmd run build` → `dist/`, served by `Dockerfile` + `nginx.conf`
  (SPA fallback, 1-year cache on static assets).
- Desktop: Tauri 2 (`src-tauri/`) bundling NSIS, then `installer/open-chart.iss`
  (Inno Setup, per-user install) packages `src-tauri/target/release/app.exe`
  as **"Open Chart.exe"** → `installer/Output/Open-Chart-<version>-Setup.exe`.
- CI: `.github/workflows/ci.yml` (lint, type-check, coverage, build, npm audit);
  `release.yml` on `v*` tags zips `dist/` onto a GitHub release.

See [[overview]] for how to run, [[conventions]] for structure rules, [[gotchas]] for traps.
