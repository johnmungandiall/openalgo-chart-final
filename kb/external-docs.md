# External docs — official documentation, versions and ecosystem for what this project builds on.

Verified **2026-10-03** against npm (`npm.cmd view <pkg> version`) and a web search.
Re-check before quoting a version as current.

## The gateway this app talks to: OpenAlgo
- Official docs: **https://docs.openalgo.in/** · site https://www.openalgo.in/
- Source: **https://github.com/marketcalls/openalgo** (releases:
  `https://github.com/marketcalls/openalgo/releases`)
- What it is: a free, self-hosted algo-trading platform for Indian markets — Python
  **Flask + React 19**, a unified REST/WebSocket API across 30+ broker integrations
  (the README currently cites 36 plugins: 35 securities + Delta Exchange for crypto).
  The web portal is a separate repo, `marketcalls/openalgo-webpage` (Next.js 15).
- Why it matters here: this app's whole data layer is the OpenAlgo API contract —
  REST `/api/v1/*` and the tick WebSocket. `OPENALGO-API-CONTRACT.md` in the repo root
  records the expected wire shape, and the Quantonomous Router implements the same
  contract on `127.0.0.1:1100` / `:1200` ([[features/market-data]]).

## The chart renderer: TradingView Lightweight Charts
- Docs: **https://tradingview.github.io/lightweight-charts/** — series primitives:
  `.../docs/plugins/series-primitives`
- **v4 → v5 migration guide** (needed before any version bump):
  `https://tradingview.github.io/lightweight-charts/docs/migrations/from-v4-to-v5`
  — v5 extracted features (e.g. watermark) out of the core and re-implemented them as
  pane primitives, which is the pattern `src/plugins/` already follows.
- Releases/changelog: **https://github.com/tradingview/lightweight-charts/releases**
  — worth knowing: the repo now ships an **"Agent Skill"** teaching coding assistants
  the v5 conventions and common foot-guns (time, scales, markers, plugins, wrappers).
  Read it before a large chart-engine change ([[features/chart-engine]]).
- npm: **5.2.1** is latest; this project pins `^5.0.9`.

## Versions: this project vs npm latest (2026-10-03)
| Package | Project pins | Latest on npm |
|---|---|---|
| lightweight-charts | ^5.0.9 | 5.2.1 |
| react / react-dom | ^19.2.0 | 19.3.0 |
| vite | ^7.2.4 | 8.3.2 |
| zustand | ^5.0.10 | 5.0.15 |
| vitest | ^4.0.16 | 5.0.3 |
| @playwright/test | ^1.57.0 | 1.63.0 |
| @tauri-apps/cli | ^2.11.2 | 2.12.1 |
| @tauri-apps/api | ^2.11.0 | 2.12.1 |

Everything is a caret range, so patch/minor updates already flow in on a fresh
`npm.cmd install` (that is why this machine resolved Vite 7.3.6 and Vitest 4.1.11).
The two **major** bumps that would need migration work are **Vite 8** and
**Vitest 5** — Vite 8 sits behind `vitest.config.ts`/`vite.config.ts` and the CI
workflow, so treat it as a planned upgrade, not a routine update.

## Desktop shell: Tauri 2
- Docs: **https://v2.tauri.app/** · release notes: `https://v2.tauri.app/release/` (per-package
  changelogs) and `https://github.com/tauri-apps/tauri/releases`.
- Pinned: `@tauri-apps/cli` ^2.11.2 and `@tauri-apps/api` ^2.11.0; both are at
  **2.12.1** on npm (2026-10-03). Config: `src-tauri/tauri.conf.json` ([[cheatsheet]]).
- Uses the WebView2 runtime, which ships with Windows 10/11 — no separate installer
  for the end user (see `installer/open-chart.iss`).

## Ecosystem / community
- OpenAlgo community and docs hub: https://www.openalgo.in/ (docs, downloads, academy).
- Broker-plugin count and feature claims move fast — read the live repo README rather
  than trusting a number from a note or an older README copy.
