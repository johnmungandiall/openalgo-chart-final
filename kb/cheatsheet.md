# Cheatsheet — the commands and snippets you reach for most.

## Run / build / test
> Always **`npm.cmd`** / **`npx.cmd`** — `npm.ps1` is blocked by this machine's
> PowerShell execution policy.

- `npm.cmd install` — install dependencies (first time)
- `npm.cmd run dev` — Vite dev server, **http://localhost:5173/**
- `npm.cmd run build` — `tsc -b && vite build` → `dist/`
- `npm.cmd run preview` — serve the built app
- `npm.cmd run type-check` — `tsc --noEmit`
- `npm.cmd run lint` / `lint:fix` — ESLint
- `npm.cmd run test` — vitest run · `npx.cmd vitest run <path>` for one file
- `npm.cmd run test:coverage` — vitest + v8 coverage (thresholds are all 0)
- `npm.cmd run test:e2e` — Playwright (see the baseURL caveat in [[gotchas]])
- `npm.cmd run tauri dev` / `tauri build` — desktop shell

## Desktop / packaging
- Tauri config: `src-tauri/tauri.conf.json` (productName "Open Chart",
  identifier `in.quantonomous.openchart`, devUrl 5173, target `nsis`).
- Windows installer: `"C:\Program Files\Inno Setup 7\ISCC.exe" installer\open-chart.iss`
  → `installer/Output/Open-Chart-<version>-Setup.exe` (per-user, no admin).
- Docker: `Dockerfile` (node:22-alpine build → nginx:alpine) + `nginx.conf`
  (SPA fallback + 1-year asset cache).

## Backend / licensing ([[features/activation-licensing]])
- Repoint the app: `SUPABASE_URL` / `SUPABASE_ANON_KEY` in
  `src/services/activation/config.ts`, or `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` in an untracked `.env.local`.
- Apply a migration to a project: POST the file as `{"query": "<sql>"}` to
  `https://api.supabase.com/v1/projects/<ref>/database/query` with
  `Authorization: Bearer sbp_…`, then send `notify pgrst, 'reload schema';`.
- Read a project's anon key: `GET https://api.supabase.com/v1/projects/<ref>/api-keys`.
- Is a Supabase host alive? `nslookup <ref>.supabase.co 8.8.8.8` — an existing
  project resolves; a paused/deleted one returns NXDOMAIN.
- Issue a licence key: `insert into public.licenses (license_key, email, valid_days, notes)`
  (`valid_days` null = perpetual). Revoke: `status='revoked'`. Free a device:
  `device_id=null, activated_at=null, expires_at=null`.

## Gateway / data
- Host & WS come from `src/services/api/config.ts#getApiBase` / `#getWebSocketUrl`;
  `src/main.tsx` force-seeds `oa_host_url` / `oa_ws_url` to the Quantonomous Router
  (`127.0.0.1:1100` REST, `127.0.0.1:1200` WS).
- Dev proxy targets are in `vite.config.ts#proxy`; override the REST target with
  the `OPENALGO_API_TARGET` env var.
- Demo mode without a backend: open `?demo=true` (persisted as `oc_demo_mode`) —
  `src/services/mockDataService.ts#isDemoMode`.

## Debugging in the browser
- `window.debugAlerts` — alert debug utilities (`getDiagnostics`, `print`,
  `enableDebug`, `disableDebug`, `createTest`, `triggerTest`, `clearAll`,
  `monitorPrices`, `checkFiltering`), loaded from `src/utils/debugAlerts.ts`.
- App state in localStorage is keyed from `src/constants/storageKeys.ts#STORAGE_KEYS`
  (`oa_apikey`, `oa_host_url`, `oa_ws_url`, `tv_theme`, `tv_alerts`, …).
- Chart/workspace state persists in zustand under `openalgo-workspace-storage`
  (`src/store/workspaceStore.ts`).

See [[overview]] for setup, [[features/testing]] for where tests live.
