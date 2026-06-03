# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Chart is a professional trading/charting application built with React 19, TypeScript, and the `lightweight-charts` library. It connects to an OpenAlgo backend (REST API on port 5000, WebSocket on port 8765) for market data and order execution. Designed for localhost-only use.

## Commands

```bash
npm run dev              # Start Vite dev server on port 5001
npm run build            # TypeScript compile + Vite production build
npm run lint             # ESLint (JS/JSX only — no TS rules configured)
npm run lint:fix         # ESLint with auto-fix
npm run type-check       # TypeScript type checking (tsc --noEmit)
npm run test             # Vitest unit tests (single run)
npm run test:watch       # Vitest in watch mode
npm run test:coverage    # Vitest with V8 coverage
npm run test:e2e         # Playwright e2e tests (requires dev server on :5001)
npm run test:e2e:ui      # Playwright with interactive UI
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

### TypeScript Configuration

Strict mode is **disabled** (migration in progress). Many files are excluded from type-checking in `tsconfig.json` — check the exclude list before assuming a file is type-checked. ESLint only covers `.js/.jsx` files, not TypeScript.

### Testing

- **Unit tests**: Vitest with jsdom environment. Setup file at `tests/setup.ts`. Tests in `src/__tests__/` and `tests/`.
- **Integration tests**: Under `src/__tests__/integration/indicators/` — these are excluded from Vitest and run via Playwright (`npm run test:e2e`).
- **E2E tests**: Playwright config in `playwright.config.ts`, tests in `e2e/`. Runs against localhost:5001, Chromium only, sequential (1 worker).

### Build & Deploy

- Vite 7 with React plugin. Dev server proxies `/api` → localhost:5000 and `/ws` → localhost:8765.
- Docker build: multi-stage (Node 22 build → nginx serve).
- CI runs lint, type-check, test:coverage, build, and security audit on push to main/develop.

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
