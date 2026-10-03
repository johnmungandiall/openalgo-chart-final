# Conventions — how code and notes here are structured.

## Code
- **TypeScript + React function components.** Strict typing on the domain types in
  `src/types/`; eslint flat config in `eslint.config.js`, type-checked with
  `npm.cmd run type-check` (tsconfig.json + tsconfig.node.json).
- **Import aliases come from the `resolve.alias` map in `vite.config.ts`** — `@/`, `@components/`,
  `@hooks/`, `@services/`, `@utils/`, `@context/`, `@types/`, `@store/`,
  `@constants/`. Older modules under `src/services/` still use relative imports.
- **Styling: CSS Modules** (`Component.module.css`) beside each component; a few
  global files (`src/index.css`, `src/App.css`, `src/styles/themes.ts`).
- **State:** zustand stores in `src/store/`; React context in `src/context/`. Server
  data is fetched through services, not from components.
- **Media-query/feature logic lives in hooks** — `src/hooks/use*Handlers.ts` and the
  other `src/hooks/` modules own behaviour; components stay presentational where
  possible. The hook barrel is `src/hooks/index.ts`.
- **Services** live in `src/services/<area>/` with an `index.ts` barrel. Pure logic is
  kept free of I/O so it is unit-testable — e.g.
  `src/services/activation/accessResolver.ts#resolveAccess` takes injectable deps.
  `src/services/openalgo.ts` is a deprecated-style barrel kept for back-compat.
- **Chart primitives** subclass `src/plugins/plugin-base.ts` and are registered per
  plugin folder with its own `index.ts` + `*Constants.ts`.
- **localStorage keys are centralised** in `src/constants/storageKeys.ts#STORAGE_KEYS`
  (plus a few module-local keys such as `DEMO_MODE_KEY` in
  `src/services/mockDataService.ts` and `LICENSE_KEY_STORAGE` in
  `src/services/activation/config.ts`). Read/write through
  `src/services/storageService.ts` helpers rather than raw `localStorage`.
- **Lazy-load heavy modals** with `React.lazy` (see `src/App.tsx` imports).

## Tests (see [[features/testing]])
- Unit/component: **vitest** (`vitest.config.ts`), jsdom, `tests/setup.ts`. Files:
  `src/__tests__/*.test.ts(x)`, `src/__tests__/indicators/**`, `tests/unit/**`.
  Backend calls are mocked with **msw** (`tests/mocks/server.ts`, `handlers.ts`;
  fixtures in `tests/fixtures/`).
- E2E: **Playwright** (`playwright.config.ts`), specs in `e2e/`, page object in
  `e2e/fixtures/`; `src/__tests__/integration/**` runs here too and is **excluded**
  from vitest.
- Indicator tests are grouped by kind: `src/__tests__/indicators/{oscillators,overlay,
  primitives,strategies}/`.

## Knowledge base
- One note per concern, headings for long notes; bodies are fetched on demand.
- Cite code as **`path#symbol`** — never a line number (`AGENT.md` rule); for an
  unnamed spot, name it in prose inside the enclosing symbol's pointer.
- Cross-link with `[[note]]`; release history lives only in [[changelog]].
