# Activation System — Design

**Date:** 2026-05-29
**Status:** Implemented
**Backend:** Supabase project `xxfkdfedxvbsrqajdhkv`

## Goal

Gate the desktop (`.exe`) build of OpenAlgo Chart behind a **14-day free trial,
then a paid activation key**, with a central source of truth (Supabase) so keys
can be issued, expired, and revoked.

### Decisions (locked with the user)

| Dimension | Choice |
|---|---|
| License model | Free trial (14 days), then a paid key |
| Device binding | One key = one device (bound to first activating machine) |
| Validation | Online required on every launch (no offline grace) |
| Key issuance | Manual `INSERT` into `public.licenses` in Supabase |

### Threat model (explicit)

This is a client-side gate in a desktop app, so a **determined cracker can
bypass it** (patch the binary, fake the RPC response). What it reliably delivers:
central issue/expire/revoke, stops casual key-sharing (device binding), and
activation tracking. Not uncrackable DRM. A future hardening step (signed-token
Edge Function) can be added without schema changes.

## Architecture (Approach A: RPC + locked-down RLS)

```
ActivationGate (React)  ->  fetch /rest/v1/rpc/*  ->  Supabase RPC (SECURITY DEFINER)
        |                         (anon key)                 |
   getDeviceId()                                       licenses / trials tables
   (Tauri MachineGuid)                                 (RLS: deny all direct access)
```

- **Anon key is shipped** in the client. Safe: it can only `EXECUTE` the two
  functions. RLS on `licenses`/`trials` has **no policies**, so the anon role
  cannot read or write the tables directly (verified: anon `SELECT` returns 0 rows).
- The two functions are `SECURITY DEFINER` (run as owner `postgres`, which
  bypasses RLS as table owner), so all authority lives server-side.

### Database (`supabase/migrations/0001_activation_system.sql`)

- `licenses(license_key, email, status, valid_days, device_id, activated_at, expires_at, notes, created_at)`
  - `valid_days` null = perpetual; else `expires_at = activated_at + valid_days` computed on first activation.
- `trials(device_id PK, started_at, trial_days=14)`
- `check_or_start_trial(p_device_id)` -> starts a trial on first sight of a
  device, returns `{state, started_at, expires_at, days_remaining, expired}`.
- `activate_or_validate(p_key, p_device_id)` -> binds an unbound key to the
  device (computing expiry), rejects keys bound to another device, revoked, or
  expired; returns `{valid, reason?, email?, expires_at?, activated_at?}`.

### Device identity

`src-tauri` exposes a `get_device_id` Rust command that reads the Windows
`MachineGuid` (`HKLM\SOFTWARE\Microsoft\Cryptography`), returned as `win-<guid>`.
Stable across reinstalls, hard to fake. The JS `getDeviceId()` falls back to a
persisted `web-<uuid>` in localStorage outside Tauri (dev/browser).

### Client (`src/services/activation/`)

- `config.ts` — Supabase URL + anon key (env-overridable; anon key is public).
- `deviceId.ts` — `getDeviceId()` (Tauri command, UUID fallback).
- `activationApi.ts` — `checkTrial` / `activateOrValidate` via plain `fetch` to
  PostgREST RPC (no SDK dependency).
- `accessResolver.ts` — `resolveAccess()` and `submitKey()` reduce trial+license
  state into a single `AccessState`. Dependencies are injected for unit testing.

### UI (`src/components/Activation/ActivationGate.tsx`)

Wraps `<App/>` in `main.tsx` (inside the providers, before App mounts). On launch
it calls `resolveAccess()` and renders:

- `loading` -> spinner splash
- `trial` / `licensed` -> renders the app (OpenAlgo connection only starts here)
- `locked` (trial over) / `invalid` (bad key) -> activation form (enter key)
- `offline` -> "no internet" screen with Retry

A validated key is cached in `localStorage` (`oa_license_key`) and re-validated
on every launch.

## Issuing keys (runbook)

In the Supabase SQL editor:

```sql
insert into public.licenses (license_key, email, valid_days, notes)
values ('OAC-XXXX-XXXX-XXXX', 'customer@email.com', 365, 'order #123');
-- valid_days = 365 for a 1-year license; NULL for perpetual.
```

Revoke: `update public.licenses set status='revoked' where license_key='...';`
Reset a customer's device: `update public.licenses set device_id=null, activated_at=null, expires_at=null where license_key='...';`

## Testing

- Unit: `src/__tests__/activationAccess.test.ts` — 8 tests over the resolver
  branches (trial active/expired, licensed, stale-key fallback, offline,
  submitKey success/reject/empty). Injected deps, no network.
- End-to-end (verified manually against the live project via the anon endpoint):
  trial auto-start, activation + device binding, cross-device rejection, and RLS
  blocking direct table reads.

## Notes / gotchas

- After creating functions via direct SQL (Management API), PostgREST needs
  `notify pgrst, 'reload schema';` once before the RPCs are reachable over REST.
- A `.exe` rebuild is required to ship the gate + the new Rust command.
