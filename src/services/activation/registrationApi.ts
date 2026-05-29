/**
 * Fetch wrappers over the registration RPCs (info capture, 1 account/computer).
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export interface RegistrationStatus {
  registered: boolean;
  full_name?: string;
  email?: string;
}

export interface RegisterResult {
  ok: boolean;
  reason?: string; // bad_input | bad_email | device_limit | email_taken
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
  if (!res.ok) throw new Error(`RPC ${fn} failed: ${res.status}`);
  return (await res.json()) as T;
}

export function checkRegistration(deviceId: string): Promise<RegistrationStatus> {
  return rpc<RegistrationStatus>('check_registration', { p_device_id: deviceId });
}

export function register(fullName: string, email: string, deviceId: string): Promise<RegisterResult> {
  return rpc<RegisterResult>('register', {
    p_full_name: fullName,
    p_email: email,
    p_device_id: deviceId,
  });
}
