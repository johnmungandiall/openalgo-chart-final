# Testing — what runs where, and which command to use.

Two runners: **vitest** for unit/component, **Playwright** for E2E. Always
`npm.cmd` / `npx.cmd` on this machine (see [[gotchas]]).

## vitest (unit / component)
- Config: `vitest.config.ts` (merges `vite.config.ts`) — jsdom, `globals: true`,
  setup `tests/setup.ts`, css on, coverage via v8 into `./coverage`.
- Include: `src/**/*.{test,spec}.{js,jsx,ts,tsx}` and `tests/**/*.{test,spec}.*`.
- **Excluded: `e2e` and `src/__tests__/integration/**`** (that folder holds
  Playwright specs, not vitest tests).
- Coverage thresholds are all `0`, so coverage never fails the run.
- Layout:
  - Feature/spec files in `src/__tests__/` — incl. `activationAccess.test.ts`,
    `demoMode.test.ts`, `globalAlertMonitorBarClose.test.ts`,
    `alertSymbolFilter.test.ts`, `backupService.test.ts`, `riskCalculator.test.ts`,
    `useGlobalShortcuts.test.ts`, `ModeToggle.test.tsx`.
  - Indicator tests grouped by kind: `src/__tests__/indicators/overlay/` (sma, ema,
    bollingerBands, ichimoku, pivotPoints, supertrend, vwap), `.../oscillators/`
    (rsi, macd, atr, stochastic, adx), `.../primitives/` (tpo, riskCalculator),
    `.../strategies/` (annStrategy, firstCandle, hilengaMilenga, priceActionRange,
    rangeBreakout), `.../cleanup/` and `.../debug/`.
- Fixtures/mocks: **msw** — `tests/mocks/server.ts`, `tests/mocks/handlers.ts`, data
  in `tests/fixtures/*.json`; unit tests in `tests/unit/services/` and
  `tests/unit/store/`.
- Run one file: `npx.cmd vitest run src/__tests__/activationAccess.test.ts`.

## Playwright (E2E)
- Config: `playwright.config.ts` — `testDir './e2e'`, chromium only, 1 worker,
  120s timeout, html + list reporters, traces on first retry.
- ⚠ It is **stale against the dev server**: `baseURL` and the `webServer` URL are
  both `http://localhost:5001`, while Vite serves **5173**
  (the `server.port` value in `vite.config.ts`, moved off 5001 because OpenAlgo's REST API binds it).
  E2E needs that updated (or a server on the expected URL) before it will pass.
- Specs: `e2e/risk-calculator/` — `activation`, `panel-inputs`, `auto-detect-side`,
  `draggable-lines`, `validation`, `templates`, `integration` — plus `debug.spec.ts`
  and `manual-cleanup-debug.spec.ts`. Page object:
  `e2e/fixtures/risk-calculator.fixture.ts`. Notes: `e2e/README.md`.

## CI
`​.github/workflows/ci.yml` — jobs `lint` (eslint + type-check), `test`
(`npm run test:coverage` → Codecov), `build` (`npm run build`, artifact `dist`),
`security` (`npm audit --audit-level=high`, continue-on-error) — all on
**Node 20**. `release.yml` runs unit tests + build on a `v*` tag and attaches a zip
of `dist/` to the GitHub release.

## Practice
- Run a **targeted** file for the area you changed, then broaden only when needed.
- Vitest excludes `src/__tests__/integration/**`, so a change there needs Playwright.
- Indicator maths is pure and well covered — a new indicator belongs in
  `src/utils/indicators/` with a matching test under the right
  `src/__tests__/indicators/<kind>/` folder.
