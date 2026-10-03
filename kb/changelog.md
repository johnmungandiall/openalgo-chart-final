# Changelog — notable changes, newest first.

## 2026-10-03
- Moved the activation/licensing backend off the deleted Supabase project
  `xxfkdfedxvbsrqajdhkv` (NXDOMAIN) onto `ejzyydcpsshgqluforfm`, and applied
  `supabase/migrations/0001_activation_system.sql` + `0002_registration_system.sql`
  there via the Management API (RPCs `check_or_start_trial`, `activate_or_validate`,
  `check_registration`, `register`; tables `licenses`, `trials`, `registrations`
  with RLS on). `src/services/activation/config.ts` now points at the new project,
  so the gate reaches the "Create your account" trial screen instead of
  "No internet connection". See [[features/activation-licensing]].

## Prior history
- v1.0.1 – v1.0.5 (git): OpenAlgo settings simplified to an API key, rebrand to
  "Open Chart", alert fixes (once-per-bar close, alerts filter), LIVE/DEMO toggle,
  installer repackaged with the default Tauri icon.
