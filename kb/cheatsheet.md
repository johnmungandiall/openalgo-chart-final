# Cheatsheet — the commands and snippets you reach for most.

## Run / build / test (always `npm.cmd` — `npm.ps1` is blocked on this machine)
- `npm.cmd run dev` — Vite dev server, http://localhost:5173/
- `npm.cmd run build` — `tsc -b && vite build`
- `npm.cmd run preview` — serve the production build
- `npm.cmd run test` — vitest run (`npx.cmd vitest run <file>` for one file)
- `npm.cmd run test:e2e` — Playwright
- `npm.cmd run type-check` — `tsc --noEmit`

## Common tasks
- Apply the activation migrations to a Supabase project -> POST each
  `supabase/migrations/*.sql` as `{"query": "<sql>"}` to
  `https://api.supabase.com/v1/projects/<ref>/database/query` with header
  `Authorization: Bearer sbp_…`, then send `notify pgrst, 'reload schema';`
- Repoint the app at a Supabase project -> `SUPABASE_URL` / `SUPABASE_ANON_KEY` in
  `src/services/activation/config.ts`, or `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` in an untracked `.env.local`
- Read a project's anon key -> `GET https://api.supabase.com/v1/projects/<ref>/api-keys`
- Check a Supabase host is alive -> `nslookup <ref>.supabase.co 8.8.8.8` (an existing
  project resolves; a paused/deleted one returns NXDOMAIN)

See [[overview]] for first-time setup and [[gotchas]] for what to avoid.
