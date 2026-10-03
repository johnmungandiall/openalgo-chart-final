# Conventions — how code and notes here are structured.

- TypeScript + React function components; zustand for shared state; CSS Modules
  (`*.module.css`) per component.
- Imports use the `@/` aliases from `vite.config.ts` (`@/services`, `@/components`, …).
- Services live in `src/services/<area>/` with an `index.ts` re-export barrel; pure
  logic is kept separate from I/O so it is unit-testable (`accessResolver.ts` takes
  injected deps for exactly this reason).
- Tests: vitest, `src/__tests__/*.test.ts(x)`; e2e specs in `e2e/` (Playwright).
- Backend work (licensing) is versioned as SQL under `supabase/migrations/NNNN_*.sql`.
- KB notes cite code as `path#symbol` (never line numbers) and cross-link with `[[note]]`.
