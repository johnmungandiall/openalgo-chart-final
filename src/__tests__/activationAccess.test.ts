import { describe, it, expect, vi } from 'vitest';
import {
  resolveAccess,
  submitKey,
  submitRegistration,
  type AccessDeps,
} from '../services/activation/accessResolver';
import type { TrialResult, LicenseResult } from '../services/activation/activationApi';

function makeDeps(overrides: Partial<AccessDeps> = {}): AccessDeps {
  let stored: string | null = null;
  return {
    getDeviceId: vi.fn(async () => 'dev-1'),
    // Default: device is already registered, so existing tests reach trial/license.
    checkRegistration: vi.fn(async () => ({ registered: true, email: 'u@x.com' })),
    register: vi.fn(async () => ({ ok: true })),
    checkTrial: vi.fn(async (): Promise<TrialResult> => ({
      state: 'trial',
      expires_at: '2026-06-12T00:00:00Z',
      days_remaining: 10,
      expired: false,
    })),
    activate: vi.fn(async (): Promise<LicenseResult> => ({ valid: true, expires_at: null })),
    getStoredKey: () => stored,
    setStoredKey: (k: string) => {
      stored = k;
    },
    clearStoredKey: () => {
      stored = null;
    },
    ...overrides,
  };
}

describe('resolveAccess', () => {
  it('returns needs_registration when the device has no account', async () => {
    const deps = makeDeps({ checkRegistration: vi.fn(async () => ({ registered: false })) });
    const state = await resolveAccess(deps);
    expect(state).toEqual({ status: 'needs_registration' });
    expect(deps.checkTrial).not.toHaveBeenCalled();
    expect(deps.activate).not.toHaveBeenCalled();
  });

  it('returns trial when no key stored and trial active', async () => {
    const deps = makeDeps();
    const state = await resolveAccess(deps);
    expect(state).toEqual({ status: 'trial', daysRemaining: 10, expiresAt: '2026-06-12T00:00:00Z' });
    expect(deps.activate).not.toHaveBeenCalled();
  });

  it('returns locked/trial_expired when trial is over and no key', async () => {
    const deps = makeDeps({
      checkTrial: vi.fn(async () => ({ state: 'trial', expired: true, days_remaining: 0 })),
    });
    expect(await resolveAccess(deps)).toEqual({ status: 'locked', reason: 'trial_expired' });
  });

  it('returns licensed when a stored key validates', async () => {
    const deps = makeDeps({
      getStoredKey: () => 'GOOD-KEY',
      activate: vi.fn(async () => ({ valid: true, expires_at: '2027-01-01T00:00:00Z', email: 'a@b.com' })),
    });
    const state = await resolveAccess(deps);
    expect(state).toEqual({ status: 'licensed', expiresAt: '2027-01-01T00:00:00Z', email: 'a@b.com' });
    expect(deps.checkTrial).not.toHaveBeenCalled();
  });

  it('drops a stored key that no longer validates and falls back to trial', async () => {
    const clearStoredKey = vi.fn();
    const deps = makeDeps({
      getStoredKey: () => 'REVOKED',
      clearStoredKey,
      activate: vi.fn(async () => ({ valid: false, reason: 'revoked' })),
    });
    const state = await resolveAccess(deps);
    expect(clearStoredKey).toHaveBeenCalled();
    expect(state.status).toBe('trial');
  });

  it('returns offline when the network throws', async () => {
    const deps = makeDeps({
      checkTrial: vi.fn(async () => {
        throw new Error('network');
      }),
    });
    expect(await resolveAccess(deps)).toEqual({ status: 'offline' });
  });
});

describe('submitKey', () => {
  it('caches the key and returns licensed on success', async () => {
    const setStoredKey = vi.fn();
    const deps = makeDeps({
      setStoredKey,
      activate: vi.fn(async () => ({ valid: true, expires_at: null })),
    });
    const state = await submitKey('  MY-KEY  ', deps);
    expect(setStoredKey).toHaveBeenCalledWith('MY-KEY');
    expect(state.status).toBe('licensed');
  });

  it('returns invalid with reason on rejection and does not cache', async () => {
    const setStoredKey = vi.fn();
    const deps = makeDeps({
      setStoredKey,
      activate: vi.fn(async () => ({ valid: false, reason: 'bound_other_device' })),
    });
    const state = await submitKey('SHARED-KEY', deps);
    expect(state).toEqual({ status: 'invalid', reason: 'bound_other_device' });
    expect(setStoredKey).not.toHaveBeenCalled();
  });

  it('rejects empty input without calling the API', async () => {
    const deps = makeDeps();
    const state = await submitKey('   ', deps);
    expect(state).toEqual({ status: 'invalid', reason: 'bad_input' });
    expect(deps.activate).not.toHaveBeenCalled();
  });
});

describe('submitRegistration', () => {
  it('registers then resolves access (trial) on success', async () => {
    const deps = makeDeps({ register: vi.fn(async () => ({ ok: true })) });
    const outcome = await submitRegistration('Jane Doe', 'jane@x.com', deps);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.next.status).toBe('trial');
    expect(deps.register).toHaveBeenCalledWith('Jane Doe', 'jane@x.com', 'dev-1');
  });

  it('surfaces device_limit rejection', async () => {
    const deps = makeDeps({ register: vi.fn(async () => ({ ok: false, reason: 'device_limit' })) });
    const outcome = await submitRegistration('Jane', 'jane@x.com', deps);
    expect(outcome).toEqual({ ok: false, reason: 'device_limit' });
  });

  it('rejects empty fields without calling the API', async () => {
    const deps = makeDeps();
    const outcome = await submitRegistration('', '  ', deps);
    expect(outcome).toEqual({ ok: false, reason: 'bad_input' });
    expect(deps.register).not.toHaveBeenCalled();
  });
});
