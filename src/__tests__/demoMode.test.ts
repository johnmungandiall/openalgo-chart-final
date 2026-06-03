import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isDemoMode, setDemoMode, DEMO_MODE_KEY } from '../services/mockDataService';

/** Replace window.location with a controllable stub. `search` like '' or '?demo=true'. */
function stubLocation(search: string) {
  const reload = vi.fn();
  const replace = vi.fn();
  const href = `http://localhost:5001/${search}`;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { search, href, reload, replace },
  });
  return { reload, replace };
}

describe('isDemoMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('URL ?demo=true overrides localStorage (true)', () => {
    stubLocation('?demo=true');
    (localStorage.getItem as any).mockReturnValue('false');
    expect(isDemoMode()).toBe(true);
  });

  it('URL ?demo=false overrides localStorage (false)', () => {
    stubLocation('?demo=false');
    (localStorage.getItem as any).mockReturnValue('true');
    expect(isDemoMode()).toBe(false);
  });

  it('no URL param + localStorage "true" -> true', () => {
    stubLocation('');
    (localStorage.getItem as any).mockReturnValue('true');
    expect(isDemoMode()).toBe(true);
  });

  it('no URL param + localStorage unset -> false', () => {
    stubLocation('');
    (localStorage.getItem as any).mockReturnValue(null);
    expect(isDemoMode()).toBe(false);
  });
});

describe('setDemoMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists "true" to localStorage', () => {
    stubLocation('');
    setDemoMode(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(DEMO_MODE_KEY, 'true');
  });

  it('persists "false" to localStorage', () => {
    stubLocation('');
    setDemoMode(false);
    expect(localStorage.setItem).toHaveBeenCalledWith(DEMO_MODE_KEY, 'false');
  });

  it('reloads when no ?demo param is present', () => {
    const { reload, replace } = stubLocation('');
    setDemoMode(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('clears the ?demo override and replaces the URL when present', () => {
    const { replace, reload } = stubLocation('?demo=true');
    setDemoMode(false);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    const newUrl = (replace.mock.calls[0] as unknown[])[0] as string;
    expect(newUrl).not.toContain('demo=');
  });
});
