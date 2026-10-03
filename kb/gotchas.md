# Gotchas — traps specific to this repo. Read before editing.

- **`npm.cmd`, never `npm`** — `npm.ps1` is disabled by the PowerShell execution
  policy on this machine; use `npx.cmd` likewise.
- **The activation gate is a hard block on the whole app.** `ActivationGate` wraps
  everything, so an unreachable licensing backend means *no* chart UI at all — it
  looks like a broken app but is a backend/DNS problem.
  `src/services/activation/accessResolver.ts#resolveAccess` catches **every** error
  and returns `{status:'offline'}`, so the screen never names the real cause; check
  the DNS/HTTP of the Supabase host before debugging the UI.
  See [[features/activation-licensing]].
- **The forced router URLs in `src/main.tsx` win over anything saved.** Host
  (`http://127.0.0.1:1100`) and WS (`ws://127.0.0.1:1200`) are re-written into
  localStorage on every load, so a stale `:5001` value cannot leak in — but it also
  means editing those constants is the only way to point the app elsewhere.
  The service defaults in `src/services/api/config.ts#DEFAULT_HOST` /
  `#DEFAULT_WS_HOST` are the OpenAlgo originals (`:5001` / `:8765`) and are what the
  dev proxy targets.
- **`shouldUseProxy()` only kicks in for the default localhost host** — with a
  custom host the app calls it directly, so a non-proxied host must allow CORS.
- **The API envelope is `{status:'success'|'error', data}`** — `makeApiRequest`
  returns `defaultValue` (usually null) on `error`, so a silent `null` usually means
  a failed call, not an empty result.
- **Playwright's `baseURL` is stale.** `playwright.config.ts` points at
  `http://localhost:5001` and starts `npm run dev` on that URL, but Vite now serves
  **5173** (`vite.config.ts#server.port`, moved off 5001 because OpenAlgo's REST API
  binds it). E2E runs need the config updated or a server started on the expected URL.
- **`src/__tests__/integration/**` is excluded from vitest** (it holds Playwright
  specs) — see `vitest.config.ts`. Do not expect `npm.cmd run test` to cover it.
- **CI runs Node 20** (`.github/workflows/ci.yml`) while the Dockerfile builds on
  `node:22-alpine` — a dependency needing a newer Node shows up only in Docker.
- **`.env.local` is gitignored via the `*.local` pattern** (`.gitignore`), which is
  what keeps a real broker key out of git. Production builds ignore
  `VITE_OPENALGO_API_KEY` on purpose.
- **Do not add a broker key to committed source** — `src/main.tsx` documents the
  placeholder-removal logic (`OLD_PLACEHOLDER_KEY`) that exists precisely because a
  baked-in key 403s every REST call and leaves the chart empty.
- **`src/utils/indicators/` filenames do not always match the indicator name** —
  ADX lives in `avg_directional_index.ts`. Grep the folder instead of assuming a file.
- **`docs/` and the root `*.md` status files are historical.** Several describe
  states that have since changed; verify against the code before repeating a claim
  from them.
- **`activator/activator/` is a separate Flutter project** — not part of the Vite build.
