# Activation & licensing — the trial/licence gate that wraps the whole app.

Every launch resolves access against Supabase **before** the OpenAlgo connection
starts, so an unlicensed or expired app never fetches data. Free 14-day trial per
device, then a paid activation key bound to one device.

## Client flow
- `src/main.tsx` — renders `<App/>` inside `ActivationGate`, inside all providers.
- `src/components/Activation/ActivationGate.tsx#ActivationGate` — one screen per
  access state: loading splash → `needs_registration` (name + email sign-up, one
  account per computer) → `trial`/`licensed` (renders the app) → `locked`/`invalid`
  (activation-key form) → `offline` ("No internet connection" + Retry).
- `src/services/activation/accessResolver.ts#resolveAccess` — gate 1
  `check_registration`; then a cached key (`localStorage` `oa_license_key`) via
  `activate_or_validate`; else `check_or_start_trial`. **Any thrown error becomes
  `{status:'offline'}`** — which is why a dead backend looks like a network fault.
- `src/services/activation/activationApi.ts`, `.../registrationApi.ts` — plain
  `fetch` POSTs to `${SUPABASE_URL}/rest/v1/rpc/<fn>` with the anon key (no SDK).
- `src/services/activation/deviceId.ts#getDeviceId` — Tauri `get_device_id`
  (Windows MachineGuid) in the packaged app; a persisted UUID (`oa_device_id`,
  stored as `web-<uuid>`) in the browser.

## Backend
- Config lives in `src/services/activation/config.ts` (`SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, overridable via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  in an untracked `.env.local`). The anon key is public/shippable by design — RLS
  denies all direct table access, so the RPCs are the only entry points.
- Current project: **`ejzyydcpsshgqluforfm`** (ACTIVE_HEALTHY, ap-northeast-2).
- Schema: `supabase/migrations/0001_activation_system.sql` (`licenses`, `trials`,
  `check_or_start_trial`, `activate_or_validate`) and
  `0002_registration_system.sql` (`registrations`, `check_registration`, `register`).
- Apply a migration by POSTing the file to the Management API:
  `POST https://api.supabase.com/v1/projects/<ref>/database/query` with
  `{"query":"<sql>"}` and a `Bearer sbp_…` token — then `notify pgrst, 'reload schema'`.
- Issue a key: `insert into public.licenses (license_key, email, valid_days, notes)`
  — `valid_days` null = perpetual. Revoke: set `status='revoked'`. Free a device:
  set `device_id=null, activated_at=null, expires_at=null`.

## Gotchas
- A **paused/deleted** Supabase project stops serving its hostname → NXDOMAIN →
  the gate shows "No internet connection". The retired project here was
  `xxfkdfedxvbsrqajdhkv` (now NXDOMAIN). Check DNS first, not the network.
- The gate must resolve online on every launch: `offline` is a hard block, there is
  no cached-access fallback.

See [[overview]] for how to run the app; [[cheatsheet]] for the apply/repoint commands.
