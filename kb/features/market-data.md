# Market data — REST/WebSocket paths, ticks, alerts, time sync and demo mode.

Everything below talks to an **OpenAlgo-compatible gateway**. The app ships
pre-pointed at the Quantonomous Router (REST `127.0.0.1:1100`, WS `127.0.0.1:1200`,
force-seeded in `src/main.tsx`); the service defaults in
`src/services/api/config.ts#DEFAULT_HOST` / `#DEFAULT_WS_HOST` are the upstream
OpenAlgo ports (`5001` / `8765`) and are what the dev proxy targets.

## REST
- `src/services/api/client.ts#makeApiRequest` — the single request path: POST,
  `apikey` injected into the body when auth is required, unwraps the
  `{status:'success'|'error', data}` envelope, returns `defaultValue` (null) on
  failure. `makeGetRequest` / `makePostRequest` / `batchApiRequests` wrap it.
- `src/services/api/config.ts#getApiBase` — `/api/v1` through the Vite/nginx proxy
  for the default localhost host, else `${host}/api/v1`.
  `#getWebSocketUrl` — `ws(s)://<page host>/ws` in local dev, else the stored WS host.
  `#getApiKey` / `#checkAuth` read `oa_apikey` from localStorage.
- Candles & quotes: `src/services/chartDataService.ts` (`getKlines`,
  `getHistoricalKlines`, `getTickerPrice`, `getDepth`, `getCachedPrevClose`).
- Instruments/symbols: `src/services/instrumentService.ts`; market/sector data:
  `marketService.ts`, `marketCapService.ts`, `src/data/stockLists.ts`,
  `src/data/market-cap-data.csv`.
- Options: `src/services/optionsApiService.ts`, `optionChain.ts`,
  `optionChainCache.ts`, `oiDataService.ts`, `oiProfileService.ts`.
- Trading: `src/services/trading/account.service.ts` (funds, positions, orders,
  trades, holdings) and `src/services/orderService.ts` (place/modify/cancel),
  used through `src/context/OrderContext.tsx`.
- `src/services/openalgo.ts` — a **back-compat barrel** that re-exports the split
  services; import the specific service in new code.

## WebSocket / ticks
- `src/services/tickDataService.ts` — the live tick subscription.
- `src/services/tickStore.ts#addTick` — per-symbol circular buffer
  (`MAX_TICKS_IN_MEMORY = 10000`), with `Tick { time, price, volume?, buyVolume?,
  sellVolume?, side? }` and listener sets.
- `src/services/tickAggregator.ts` — aggregates ticks for footprint/delta views.
- `src/services/volumeHistory.ts`, `tickConstants.ts` — supporting data.
- Connection health: `src/services/connectionStatus.ts` (state + network recovery).

## Alerts
- `src/services/globalAlertMonitor.ts#GlobalAlertMonitor` — singleton
  `globalAlertMonitor`; loads stored alerts, subscribes to prices, evaluates
  conditions and fires. Conditions/formatting live in
  `src/utils/alerts/alertConditions.ts#*`, `alertEvaluator.ts`,
  `alertMessageTemplate.ts`.
- Indicator-based alerts read `src/services/indicatorDataManager.ts` caches rather
  than chart state ([[features/chart-engine]]).
- Delivery: `src/services/webhookService.ts#sendWebhook`.
- UI: `src/components/Alerts/AlertsPanel.tsx`, `Alert/AlertDialog.tsx`,
  `IndicatorAlert/IndicatorAlertDialog.tsx`, `GlobalAlertPopup/`.

## Time
- `src/services/timeService.ts` — syncs IST from NPL India via `/npl-time`
  (`VITE_NPL_TIME_URL`; `disabled` turns it off, which `.env.production` sets so a
  packaged build does not depend on a dev proxy). Resync every 60s; IST offset 19800s.
- `src/utils/indicators/timeUtils.ts` — IST market-hours/time-window helpers.

## Demo / offline
- `src/services/mockDataService.ts#isDemoMode` — `?demo=true|false` overrides the
  persisted `oc_demo_mode`; generates candles and simulated ticks with no gateway.
- `src/components/Topbar/components/ModeToggle.tsx` — the LIVE/DEMO switch;
  `src/components/Chart/DemoSpeedControl.tsx` — playback speed in demo mode.

See [[architecture]] for the shape, [[features/activation-licensing]] for the gate
that runs before any of this.
