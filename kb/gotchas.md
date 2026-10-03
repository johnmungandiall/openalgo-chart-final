# Gotchas — traps specific to this repo. Read before editing.

- **`npm.cmd`, never `npm`** — `npm.ps1` is disabled by the PowerShell execution
  policy on this machine; `npx.cmd` likewise.
- **The activation gate is a hard block on the whole app** — nothing renders (no
  chart UI, no OpenAlgo connection) until Supabase returns trial/licence access via
  `ActivationGate`. An unreachable/dead Supabase project therefore looks like a
  broken app; verify DNS before debugging the UI. See [[features/activation-licensing]].
- **`offline` swallows the real error** — `resolveAccess` catches every failure and
  returns `{status:'offline'}`, so the on-screen message never names the cause.
- Use the **`@/`… path aliases** (`@/services/...`) when `src` is the base, per
  `vite.config.ts`; relative imports are used inside `src/services/activation/`.
