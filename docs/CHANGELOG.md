# Changelog

All notable changes to Open Chart will be documented in this file.

## [Unreleased]

### Fixed
- **Indicator alerts — "Once Per Bar Close" now actually waits for the candle to close.**
  Previously this frequency behaved identically to "Once Per Bar": the background
  monitor recalculated indicators from the live, still-forming candle and fired on
  the first transient intrabar signal (e.g. UT Bot UP/DN flips that reversed before
  the bar closed), producing false alerts. The monitor now drops the forming bar and
  evaluates the last *closed* bar's final, immutable values for `once_per_bar_close`,
  so the alert fires once per bar at close. Price-based conditions compare against the
  closed bar's close instead of the live tick. `once_per_bar` (intrabar) is unchanged.
  Applies to existing alerts too — no need to recreate them.
  (`src/services/globalAlertMonitor.ts`, regression test
  `src/__tests__/globalAlertMonitorBarClose.test.ts`)

### Added
- **TypeScript Migration**: Full TypeScript configuration with strict mode
  - `tsconfig.json` with comprehensive strict type checking
  - Path aliases for cleaner imports (`@/`, `@components/`, etc.)
  - Type definitions for all API, domain, and UI types

- **Type System** (`src/types/`)
  - API types: Orders, Positions, Account, Market Data, Options
  - Domain types: Trading, Chart, Alerts, Workspace
  - UI types: Components, Context, Hooks
  - Utility types: Common patterns, branded types, Result type

- **Service Layer Migration** (`src/services/`)
  - TypeScript API client with typed request/response
  - Trading services: Account, Order management
  - Centralized endpoint constants

- **Store Migration** (`src/store/`)
  - TypeScript Zustand stores with full type safety
  - Workspace store with chart configuration
  - Market data store with ticker updates

- **Hooks Migration** (`src/hooks/`)
  - `useDebounce` - Debounce values
  - `useLocalStorage` - Persistent state
  - `useClickOutside` - Click outside detection
  - `useMediaQuery` - Responsive breakpoints

- **Constants Migration** (`src/constants/`)
  - Order constants with type exports
  - Storage keys with TypeScript const assertions

- **Context Providers** (`src/context/`)
  - UserContext with authentication state
  - ThemeContext with theme management

- **Documentation** (`docs/`)
  - Architecture overview
  - Contributing guidelines
  - Code standards
  - Review checklist

- **Testing Infrastructure**
  - Vitest configuration with coverage
  - MSW mock handlers
  - Test fixtures
  - Unit test examples

- **CI/CD Workflows** (`.github/workflows/`)
  - Lint, test, build pipeline
  - Coverage reporting
  - E2E test execution
  - Release automation

### Changed
- Updated `package.json` with TypeScript dependencies
- Converted Vite config to TypeScript
- Updated test setup to TypeScript

### Migration Notes
- Existing `.js` and `.jsx` files are still supported
- Gradual migration can continue with mixed file types
- Type imports available from `@/types`
