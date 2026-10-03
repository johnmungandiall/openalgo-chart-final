# Glossary — project-specific terms.

- **Open Chart** — this app's product name (package `open-chart`); rebranded from
  `openalgo-chart` at v1.0.3. Windows binary is "Open Chart.exe".
- **OpenAlgo** — the open-source trading gateway/API this app was built against;
  endpoints are `/api/v1/*` (REST) and a WebSocket for ticks.
- **Quantonomous Router** — the OpenAlgo-compatible gateway this build ships
  pointed at: REST `127.0.0.1:1100`, WS `127.0.0.1:1200`. Seeded in `src/main.tsx`.
- **Klines** — OHLCV candles fetched from the gateway
  (`src/services/chartDataService.ts#getKlines`).
- **Interval** — candle timeframe; the `TimeInterval` union in
  `src/types/domain/chart.ts#TimeInterval` covers `1m`…`4h`, `D`/`1d`, `W`/`1w`, `M`/`1M`.
- **Chart type** — how a series is rendered; `ChartType` in
  `src/types/domain/chart.ts#ChartType` = candlestick, line, area, baseline,
  renko, heikinashi.
- **Layout** — the multi-pane chart grid; `LayoutType` in
  `src/types/domain/workspace.ts#LayoutType` = `'1' | '2' | '2v' | '3' | '4' | '6'`.
- **Indicator** — a computed series/overlay; maths in `src/utils/indicators/`
  ([[features/chart-engine]]).
- **Primitive / plugin** — a custom `lightweight-charts` series renderer
  (TPO profile, volume profile, delta, footprint, OI, power trades…); base class
  `src/plugins/plugin-base.ts#PluginBase`. Registered per folder in `src/plugins/`.
- **Drawing tool** — an interactive overlay (trend line, fibonacci, channel…).
  Active-tool names are the `DRAWING_TOOLS` list in
  `src/context/ToolContext.tsx#DRAWING_TOOLS`; the engine is `src/plugins/line-tools/`.
- **TPO / Market Profile** — time-price-opportunity profile; `tpo.ts`,
  `tpoCalculations.ts`, `tpoRenderer.ts` and `src/plugins/tpo-profile/`.
- **Watchlist** — a named symbol list with favourites; `WatchlistContext` +
  `src/components/Watchlist/`.
- **Alert** — a price or indicator condition monitored against live/OHLC data;
  evaluated by `src/services/globalAlertMonitor.ts#GlobalAlertMonitor` and
  dispatched by `src/services/webhookService.ts#sendWebhook`. Conditions live in
  `src/utils/alerts/alertConditions.ts#*` / `alertEvaluator.ts`.
- **Indicator alert** — an alert whose trigger is an indicator value (UT Bot,
  Supertrend, RSI…); configured in `src/components/IndicatorAlert/`.
- **Demo mode** — offline mode with generated candles/ticks,
  `src/services/mockDataService.ts#isDemoMode`; toggled by the LIVE/DEMO
  `ModeToggle` or `?demo=true`.
- **Replay mode** — bar-by-bar playback of historical candles for practice
  (`src/components/Replay/`).
- **Device id** — the licensing fingerprint: Windows MachineGuid in the Tauri app,
  a persisted `web-<uuid>` in the browser
  (`src/services/activation/deviceId.ts#getDeviceId`).
- **Access state** — the licence gate's verdict on launch
  (`src/services/activation/accessResolver.ts#AccessState`): loading,
  needs_registration, licensed, trial, locked, invalid, offline.
- **OI** — open interest; option-chain / OI-profile data
  (`src/services/oiDataService.ts`, `src/services/oiProfileService.ts`).
- **ATM / PCR / Greeks** — option-chain terms used in the pickers:
  at-the-money strike, put-call ratio, and Delta/IV from the gateway.

See [[architecture]] for how these pieces fit; [[features/chart-engine]] and
[[features/market-data]] for the two deep areas.
