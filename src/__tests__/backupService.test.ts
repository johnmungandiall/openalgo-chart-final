import { describe, it, expect, beforeEach } from 'vitest';
import { buildBundle, parseBundle, applyBundle } from '@/services/backupService';
import type { Bundle } from '@/services/backupService';
import { BUNDLE_APP_ID, BUNDLE_VERSION } from '@/constants/backupCategories';
import { STORAGE_KEYS } from '@/constants/storageKeys';

// The project-wide tests/setup.ts replaces localStorage with vi.fn() stubs
// that don't actually store anything. Override with a working Map-backed
// implementation for these tests.
function installRealLocalStorage(): void {
  const store = new Map<string, string>();
  const real: Storage = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  Object.defineProperty(window, 'localStorage', { value: real, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true });
}

describe('buildBundle', () => {
  beforeEach(() => {
    installRealLocalStorage();
  });

  it('returns an empty bundle with valid header when nothing is selected', () => {
    const bundle = buildBundle([]);
    expect(bundle.app).toBe(BUNDLE_APP_ID);
    expect(bundle.version).toBe(BUNDLE_VERSION);
    expect(typeof bundle.exportedAt).toBe('string');
    expect(new Date(bundle.exportedAt).toString()).not.toBe('Invalid Date');
    expect(bundle.categories).toEqual({});
  });

  it('includes only the selected categories', () => {
    localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify([{ id: 'a1' }]));

    const bundle = buildBundle(['appearance']);

    expect(bundle.categories.appearance).toBeDefined();
    expect(bundle.categories.alerts).toBeUndefined();
    expect(bundle.categories.appearance![STORAGE_KEYS.THEME]).toBe('dark');
  });

  it('JSON-parses values when possible, keeps raw strings otherwise', () => {
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify([{ id: 'a1', symbol: 'NIFTY' }]));
    localStorage.setItem(STORAGE_KEYS.THEME, 'dark');

    const bundle = buildBundle(['appearance', 'alerts']);

    expect(bundle.categories.alerts![STORAGE_KEYS.ALERTS]).toEqual([
      { id: 'a1', symbol: 'NIFTY' },
    ]);
    expect(bundle.categories.appearance![STORAGE_KEYS.THEME]).toBe('dark');
  });

  it('omits keys that do not exist in localStorage', () => {
    const bundle = buildBundle(['appearance']);
    expect(bundle.categories.appearance).toEqual({});
  });
});

describe('parseBundle', () => {
  it('accepts a valid bundle', () => {
    const valid = {
      app: 'openalgo-chart',
      version: 1,
      exportedAt: '2026-05-29T00:00:00.000Z',
      categories: { appearance: { tv_theme: 'dark' } },
    };
    expect(parseBundle(JSON.stringify(valid))).toEqual(valid);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseBundle('{not json')).toThrow(/JSON/i);
  });

  it('rejects wrong app id', () => {
    expect(() =>
      parseBundle(JSON.stringify({ app: 'other-app', version: 1, exportedAt: '', categories: {} }))
    ).toThrow(/app/i);
  });

  it('rejects unknown version', () => {
    expect(() =>
      parseBundle(JSON.stringify({ app: 'openalgo-chart', version: 999, exportedAt: '', categories: {} }))
    ).toThrow(/version/i);
  });

  it('rejects non-object categories', () => {
    expect(() =>
      parseBundle(JSON.stringify({ app: 'openalgo-chart', version: 1, exportedAt: '', categories: [] }))
    ).toThrow(/categories/i);
  });
});

const mkBundle = (categories: Bundle['categories']): Bundle => ({
  app: 'openalgo-chart',
  version: 1,
  exportedAt: '2026-05-29T00:00:00.000Z',
  categories,
});

describe('applyBundle', () => {
  beforeEach(() => {
    installRealLocalStorage();
  });

  it('writes only keys for selected categories', () => {
    const bundle = mkBundle({
      appearance: { tv_theme: 'light' },
      alerts: { tv_alerts: [{ id: 'a1' }] },
    });

    const result = applyBundle(bundle, ['appearance']);

    expect(localStorage.getItem('tv_theme')).toBe('light');
    expect(localStorage.getItem('tv_alerts')).toBeNull();
    expect(result.writtenKeys).toContain('tv_theme');
    expect(result.workspaceTouched).toBe(false);
  });

  it('JSON.stringifies non-string values; writes strings verbatim', () => {
    const bundle = mkBundle({
      appearance: { tv_theme: 'dark' },
      alerts: { tv_alerts: [{ id: 'a1', symbol: 'NIFTY' }] },
    });

    applyBundle(bundle, ['appearance', 'alerts']);

    expect(localStorage.getItem('tv_theme')).toBe('dark');
    expect(localStorage.getItem('tv_alerts')).toBe(
      JSON.stringify([{ id: 'a1', symbol: 'NIFTY' }])
    );
  });

  it('reports workspaceTouched when the workspace category is applied', () => {
    const bundle = mkBundle({
      workspace: { 'openalgo-workspace-storage': { state: {}, version: 0 } },
    });
    const result = applyBundle(bundle, ['workspace']);
    expect(result.workspaceTouched).toBe(true);
  });

  it('leaves keys the bundle does not contain untouched', () => {
    localStorage.setItem('tv_chart_appearance', JSON.stringify({ existing: true }));
    const bundle = mkBundle({ appearance: { tv_theme: 'light' } });

    applyBundle(bundle, ['appearance']);

    expect(JSON.parse(localStorage.getItem('tv_chart_appearance')!)).toEqual({
      existing: true,
    });
  });

  it('silently skips selected categories that are missing from the bundle', () => {
    const bundle = mkBundle({});
    const result = applyBundle(bundle, ['appearance']);
    expect(result.writtenKeys).toEqual([]);
    expect(result.failedKeys).toEqual([]);
  });
});

describe('round-trip', () => {
  beforeEach(() => {
    installRealLocalStorage();
  });

  it('build → JSON → parse → apply restores original values', () => {
    localStorage.setItem('tv_theme', 'light');
    localStorage.setItem(
      'tv_chart_appearance',
      JSON.stringify({ candleUp: '#0f0', candleDown: '#f00' })
    );
    localStorage.setItem(
      'tv_alerts',
      JSON.stringify([{ id: 'a1', symbol: 'NIFTY', price: 22000 }])
    );

    const original = {
      tv_theme: localStorage.getItem('tv_theme'),
      tv_chart_appearance: localStorage.getItem('tv_chart_appearance'),
      tv_alerts: localStorage.getItem('tv_alerts'),
    };

    const bundle = buildBundle(['appearance', 'alerts']);
    const text = JSON.stringify(bundle);
    localStorage.clear();
    const parsed = parseBundle(text);
    applyBundle(parsed, ['appearance', 'alerts']);

    expect(localStorage.getItem('tv_theme')).toBe(original.tv_theme);
    expect(localStorage.getItem('tv_chart_appearance')).toBe(original.tv_chart_appearance);
    expect(localStorage.getItem('tv_alerts')).toBe(original.tv_alerts);
  });
});
