/**
 * Thin fetch wrappers over the two Supabase activation RPCs. No SDK dependency —
 * the app already does direct fetches, and these are PostgREST RPC calls.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

/** Raw shape returned by check_or_start_trial. */
export interface TrialResult {
  state: 'trial' | 'error';
  started_at?: string;
  expires_at?: string;
  days_remaining?: number;
  expired?: boolean;
  reason?: string;
}

/** Raw shape returned by activate_or_validate. */
export interface LicenseResult {
  valid: boolean;
  reason?: string; // not_found | revoked | bound_other_device | expired | bad_input
  email?: string | null;
  expires_at?: string | null;
  activated_at?: string | null;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`RPC ${fn} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function checkTrial(deviceId: string): Promise<TrialResult> {
  return rpc<TrialResult>('check_or_start_trial', { p_device_id: deviceId });
}

export function activateOrValidate(key: string, deviceId: string): Promise<LicenseResult> {
  return rpc<LicenseResult>('activate_or_validate', { p_key: key, p_device_id: deviceId });
}
