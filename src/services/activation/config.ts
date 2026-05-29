/**
 * Supabase activation backend config.
 *
 * The anon key is a PUBLIC, shippable key by design — it only grants EXECUTE on
 * the two activation RPCs (check_or_start_trial / activate_or_validate). RLS on
 * the licenses/trials tables denies all direct access, so embedding this key in
 * the client (or committing it) is safe. Override via env if you ever rotate it.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://xxfkdfedxvbsrqajdhkv.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZmtkZmVkeHZic3JxYWpkaGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjkwOTYsImV4cCI6MjA5NTYwNTA5Nn0.Q2KaskLHrDp2Ys5Sj4-MV_tUZXgthEo-kEAZ7DkKLyI';

/** localStorage key under which a validated license key is cached. */
export const LICENSE_KEY_STORAGE = 'oa_license_key';

/** localStorage key for the fallback (non-Tauri) device id. */
export const DEVICE_ID_STORAGE = 'oa_device_id';
