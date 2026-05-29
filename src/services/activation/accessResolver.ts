/**
 * Orchestrates trial + license resolution into a single AccessState the UI can
 * render. Dependencies are injected (with real defaults) so the branching logic
 * is unit-testable without network or Tauri.
 */
import { LICENSE_KEY_STORAGE } from './config';
import { getDeviceId as realGetDeviceId } from './deviceId';
import {
  checkTrial as realCheckTrial,
  activateOrValidate as realActivate,
  type TrialResult,
  type LicenseResult,
} from './activationApi';
import {
  checkRegistration as realCheckRegistration,
  register as realRegister,
  type RegistrationStatus,
  type RegisterResult,
} from './registrationApi';

export type AccessState =
  | { status: 'loading' }
  | { status: 'needs_registration' } // device has no account yet -> show sign-up form
  | { status: 'licensed'; expiresAt: string | null; email?: string | null }
  | { status: 'trial'; daysRemaining: number; expiresAt: string }
  | { status: 'locked'; reason: 'trial_expired' | 'no_device' } // trial over (or no device) -> needs a key
  | { status: 'invalid'; reason: string } // a key was tried and rejected
  | { status: 'offline' }; // could not reach Supabase

export interface AccessDeps {
  getDeviceId: () => Promise<string>;
  checkRegistration: (deviceId: string) => Promise<RegistrationStatus>;
  register: (fullName: string, email: string, deviceId: string) => Promise<RegisterResult>;
  checkTrial: (deviceId: string) => Promise<TrialResult>;
  activate: (key: string, deviceId: string) => Promise<LicenseResult>;
  getStoredKey: () => string | null;
  setStoredKey: (key: string) => void;
  clearStoredKey: () => void;
}

const defaultDeps: AccessDeps = {
  getDeviceId: realGetDeviceId,
  checkRegistration: realCheckRegistration,
  register: realRegister,
  checkTrial: realCheckTrial,
  activate: realActivate,
  getStoredKey: () => localStorage.getItem(LICENSE_KEY_STORAGE),
  setStoredKey: (k) => localStorage.setItem(LICENSE_KEY_STORAGE, k),
  clearStoredKey: () => localStorage.removeItem(LICENSE_KEY_STORAGE),
};

/**
 * Decide current access on launch: validate a cached license key if present,
 * otherwise fall back to the (auto-starting) free trial.
 */
export async function resolveAccess(deps: AccessDeps = defaultDeps): Promise<AccessState> {
  let deviceId: string;
  try {
    deviceId = await deps.getDeviceId();
  } catch {
    return { status: 'offline' };
  }

  try {
    // Gate 1: the device must have a registered account first.
    const reg = await deps.checkRegistration(deviceId);
    if (!reg.registered) {
      return { status: 'needs_registration' };
    }

    const storedKey = deps.getStoredKey();
    if (storedKey) {
      const r = await deps.activate(storedKey, deviceId);
      if (r.valid) {
        return { status: 'licensed', expiresAt: r.expires_at ?? null, email: r.email };
      }
      // Cached key no longer valid (revoked/expired/moved device) — drop it and
      // fall through to the trial check.
      deps.clearStoredKey();
    }

    const t = await deps.checkTrial(deviceId);
    if (t.state === 'trial' && !t.expired) {
      return {
        status: 'trial',
        daysRemaining: t.days_remaining ?? 0,
        expiresAt: t.expires_at ?? '',
      };
    }
    if (t.state === 'error') {
      return { status: 'locked', reason: 'no_device' };
    }
    return { status: 'locked', reason: 'trial_expired' };
  } catch {
    return { status: 'offline' };
  }
}

/**
 * Validate a key the user typed into the activation screen. On success the key
 * is cached so future launches re-validate it automatically.
 */
export async function submitKey(key: string, deps: AccessDeps = defaultDeps): Promise<AccessState> {
  const trimmed = key.trim();
  if (!trimmed) return { status: 'invalid', reason: 'bad_input' };

  let deviceId: string;
  try {
    deviceId = await deps.getDeviceId();
  } catch {
    return { status: 'offline' };
  }

  try {
    const r = await deps.activate(trimmed, deviceId);
    if (r.valid) {
      deps.setStoredKey(trimmed);
      return { status: 'licensed', expiresAt: r.expires_at ?? null, email: r.email };
    }
    return { status: 'invalid', reason: r.reason ?? 'invalid' };
  } catch {
    return { status: 'offline' };
  }
}

/** Result of a registration attempt, for the sign-up form to render errors. */
export interface RegisterOutcome {
  ok: boolean;
  /** On success, the resolved access state to transition into (trial/license). */
  next?: AccessState;
  /** On failure: device_limit | email_taken | bad_input | bad_email | offline. */
  reason?: string;
}

/**
 * Submit the sign-up form. On success it immediately resolves access so the
 * caller can transition straight into the trial/license state.
 */
export async function submitRegistration(
  fullName: string,
  email: string,
  deps: AccessDeps = defaultDeps
): Promise<RegisterOutcome> {
  if (!fullName.trim() || !email.trim()) {
    return { ok: false, reason: 'bad_input' };
  }

  let deviceId: string;
  try {
    deviceId = await deps.getDeviceId();
  } catch {
    return { ok: false, reason: 'offline' };
  }

  try {
    const r = await deps.register(fullName.trim(), email.trim(), deviceId);
    if (r.ok) {
      return { ok: true, next: await resolveAccess(deps) };
    }
    return { ok: false, reason: r.reason ?? 'invalid' };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}
