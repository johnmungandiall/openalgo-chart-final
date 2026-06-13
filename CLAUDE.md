# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Chart is a professional trading/charting application built with React 19, TypeScript, and the `lightweight-charts` library. It connects to an OpenAlgo backend (REST API on port 5001, WebSocket on port 8765) for market data and order execution. Designed for localhost-only use. Ships both as a web app (Vite/nginx) and a native desktop app (Tauri).

## Commands

```bash
npm run dev              # Start Vite dev server on port 5173
npm run build            # TypeScript compile + Vite production build
npm run preview          # Serve the production build locally (same proxy as dev)
npm run lint             # ESLint (JS/JSX only — no TS rules configured)
npm run lint:fix         # ESLint with auto-fix
npm run type-check       # TypeScript type checking (tsc --noEmit)
npm run test             # Vitest unit tests (single run)
npm run test:watch       # Vitest in watch mode
npm run test:coverage    # Vitest with V8 coverage
npm run test:e2e         # Playwright e2e tests (auto-starts the dev server)
npm run test:e2e:ui      # Playwright with interactive UI
npm run tauri            # Tauri CLI — `npm run tauri dev` / `npm run tauri build` for the desktop app
```

Run a single test file: `npx vitest run src/__tests__/riskCalculator.test.ts`

## Architecture

### Layer Structure

The app follows a strict layered architecture: Components → Hooks → Services → API/WebSocket.

- **Components** (`src/components/`): Feature-organized React components using CSS Modules for styling. Heavy modals (Settings, CommandPalette, OptionChain) are lazy-loaded.
- **Hooks** (`src/hooks/`): Custom hooks encapsulate all reusable logic. `App.tsx` composes ~15 domain-specific hooks (useSymbolHandlers, useAlertHandlers, useToolHandlers, etc.) rather than containing logic directly.
- **Services** (`src/services/`): All API calls and external communication. Components never call fetch directly — they go through services. Key services: `openalgo.ts` (main API client), `tickDataService.ts` (real-time ticks), `chartDataService.ts`, `trading/account.service.ts`, `trading/order.service.ts`.
- **Stores** (`src/store/`): Two Zustand stores — `workspaceStore` (layout, charts, indicators — persisted to localStorage) and `marketDataStore` (real-time ticker data).
- **Context** (`src/context/`): React contexts for cross-cutting concerns — User, Order, Alert, Theme, Tool, UI, Watchlist.
- **Types** (`src/types/`): Organized into `api/` (request/response contracts), `domain/` (business entities), `ui/` (component props/context), `utils/` (common utilities).
- **Indicators** (`src/utils/indicators/`): Pure calculation functions for each technical indicator (SMA, EMA, RSI, MACD, Bollinger Bands, Supertrend, etc.) plus trading strategies (ANN, First Candle, Range Breakout).

### Key Patterns

- **Path aliases**: `@/`, `@components/`, `@hooks/`, `@services/`, `@utils/`, `@context/`, `@types/`, `@store/`, `@constants/` — configured in both `vite.config.ts` and `tsconfig.json`.
- **State separation**: Server state (market data, positions) in services + stores. Client state (layout, preferences) in Zustand + localStorage. Component state (forms, local UI) in React useState.
- **Market data flow**: WebSocket → `tickDataService` → `marketDataStore` → components subscribe via selectors.
- **Chart management**: `ChartGrid` renders 1–4 independent `ChartComponent` panels. Each chart has its own symbol, interval, indicators, and strategy config managed through `workspaceStore`.
- **Indicator lifecycle**: Creation in `indicatorCreators.ts`, updates in `indicatorUpdaters.ts`, cleanup in `indicatorCleanup.ts`, metadata in `indicatorMetadata.ts` (all under `src/components/Chart/utils/`).
- **Alert evaluation**: `globalAlertMonitor` runs in the background, independent of what any chart shows. Each alert is a snapshot of its own `symbol`, `exchange`, `interval`, and indicator `params` captured at creation — changing the chart's symbol/timeframe does NOT affect existing alerts. On every WebSocket tick the monitor recalculates the indicator from the cached OHLC array via `indicatorDataManager.calculateIndicator()`. **Gotcha:** the chart updates the last OHLC element in place, so `ohlcData[n-1]` is the still-forming candle. `once_per_bar` evaluates that forming bar (intrabar); `once_per_bar_close` drops it and evaluates the last *closed* bar's immutable values. Capture new indicator calc params in `src/constants/indicatorParamKeys.ts`.

### TypeScript Configuration

Strict mode is **disabled** (migration in progress). Many files are excluded from type-checking in `tsconfig.json` — check the exclude list before assuming a file is type-checked. ESLint only covers `.js/.jsx` files, not TypeScript.

### Testing

- **Unit tests**: Vitest with jsdom environment. Setup file at `tests/setup.ts`. Tests in `src/__tests__/` and `tests/`.
- **Integration tests**: Under `src/__tests__/integration/indicators/` — these are excluded from Vitest and run via Playwright (`npm run test:e2e`).
- **E2E tests**: Playwright config in `playwright.config.ts`, tests in `e2e/`. Chromium only, sequential (1 worker). **Port mismatch:** the config still points `baseURL`/`webServer.url` at `localhost:5001`, but `npm run dev` now serves on `5173` (see Build & Deploy). Playwright auto-starts the dev server but waits on the wrong port — update `playwright.config.ts` to `5173` (or run the app there) before e2e will pass.

### Build & Deploy

- Vite 7 with React plugin, dev server on port **5173** (it was moved off 5001 because OpenAlgo's REST API now binds 5001). The same proxy applies to both `dev` and `preview`:
  - `/api` → `127.0.0.1:5001` (OpenAlgo REST; override with the `OPENALGO_API_TARGET` env var)
  - `/ws` → `127.0.0.1:8765` (OpenAlgo WebSocket)
  - `/npl-time` → `nplindia.in` NTP endpoint (server-clock sync; avoids the browser CORS block by keeping requests same-origin)
- **Desktop app**: Tauri 2 (`src-tauri/`, config in `src-tauri/tauri.conf.json`). `npm run tauri dev` points the webview at `localhost:5173`; `npm run tauri build` runs `npm run build`, compiles the Rust shell to `src-tauri/target/release/app.exe`, and bundles an NSIS installer (productName "Open Chart", identifier `in.quantonomous.openchart`).
- **Distributed installer**: the shipped installer is **Inno Setup**, not the raw NSIS bundle. Build it with `"C:\Program Files\Inno Setup 7\ISCC.exe" installer\open-chart.iss` — it wraps `app.exe` into `installer/Output/Open-Chart-<version>-Setup.exe` (per-user, no admin). This exe is committed to the repo and swapped on each release.
- **Cutting a release** (see commits `abb913a` 1.0.4, `c477844` 1.0.5 for the pattern): bump the version in **three** files — `package.json`, `src-tauri/tauri.conf.json`, `installer/open-chart.iss` (`Cargo.toml` stays `0.1.0`; Tauri uses `tauri.conf.json`). Add a `docs/CHANGELOG.md` section, `npm run tauri build`, run ISCC, swap the bundled `Open-Chart-*-Setup.exe`, and log a row in `WORK-SUMMARY.md`.
- **App icon**: lives in `src-tauri/icons/` (referenced by `tauri.conf.json` `bundle.icon` and the installer `SetupIconFile = icon.ico`). As of **1.0.5 the icon is the default Tauri icon** — the custom "Open Chart" eagle branding (added in the 1.0.3 rebrand) was removed. The icon is embedded into `app.exe` at build time, so changing it requires a full `tauri build` + ISCC repackage.
- **Web deploy**: Docker multi-stage (Node 22 build → nginx serve).
- CI (`.github/workflows/ci.yml`) runs lint, type-check, test:coverage, build, and a (non-blocking) `npm audit` security job on push/PR to `main`/`develop`.

### Licensing & Distribution (commercial sale)

Open Chart is sold as a **paid, closed-source desktop application**. Full audit in `LEGAL-LICENSING-REPORT.md`. Durable constraints — **do not break these**:

- **Derived from `crypt0inf0/openalgo-chart`** (declared MIT in its README; no formal `LICENSE` file upstream). MIT is permissive → closed-source resale is allowed. Keep the MIT acknowledgement and don't strip upstream attribution.
- **`lightweight-charts` is Apache-2.0** and requires visible attribution. **Never set `attributionLogo: false`** (`src/components/Chart/ChartComponent.tsx`) and never delete the root **`NOTICE`** file — doing so breaches the license (compliance landed in commit `d95c89f`).
- **OpenAlgo is AGPL-3.0.** The app only *connects* to it over REST/WS as an independent client — **never bundle, embed, or redistribute OpenAlgo** inside the installer (that would trigger AGPL copyleft). The AGPL `pinets`/Pine Script dependency was deliberately removed in commit `9d6bdfd`; do not reintroduce AGPL/GPL/copyleft dependencies.
- The app's own `package.json` is `private` / UNLICENSED (proprietary) — intended. "TradingView" is a trademark: keep the attribution link but never brand/market the product as TradingView or imply affiliation.

## Autonomous Agent System

This project uses an autonomous multi-agent system. Everything is project-level.

### Strict Rules
- ALL agents, skills, commands, and outputs MUST live inside this project's `.claude/` folder
- Agents must NEVER run `git commit`, `git push`, or `git add` unless the user explicitly asks
- NEVER create agents, skills, or commands in `~/.claude/` (global) or `/tmp/` — always project-level
- Before starting complex or multi-step tasks, check `.claude/agents/AGENTS.md` for available agents
- When a task benefits from parallel work or multiple roles (research, build, review, test),
  use the `autonomous` skill to orchestrate agents
- Always update `.claude/agents/AGENTS.md` and `.claude/agents/README.md` after agent work
- Agent outputs go in `.claude/agent-output/<agent-name>/`
- After orchestration runs, improve agent definitions based on what worked and what didn't
- Check `.claude/skills/autonomous-improvements/IMPROVEMENTS.md` for past learnings before
  creating new agents — avoid repeating mistakes
- After every orchestration run, append a summary row to `WORK-SUMMARY.md` in the project root
- Use project commands (`.claude/commands/`) to interact with the agent system

### Project Structure
- Work summary: `WORK-SUMMARY.md` (project root)
- Agent registry: `.claude/agents/AGENTS.md`
- Agent usage guide: `.claude/agents/README.md`
- Agent definitions: `.claude/agents/<name>.md`
- Agent outputs: `.claude/agent-output/<agent-name>/`
- Skills (created by agents): `.claude/skills/<name>/SKILL.md`
- Commands: `.claude/commands/<name>.md`
- Improvement log: `.claude/skills/autonomous-improvements/IMPROVEMENTS.md`
