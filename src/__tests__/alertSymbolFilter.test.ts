import { describe, it, expect } from 'vitest';
import { getUnderlying, filterAlertsBySymbol } from '../components/Alerts/alertSymbolFilter';

const A = (symbol: string, exchange = 'NSE') => ({ id: symbol, symbol, exchange });

describe('getUnderlying', () => {
  it('extracts the leading letters, uppercased', () => {
    expect(getUnderlying('NIFTY24DEC24000CE')).toBe('NIFTY');
    expect(getUnderlying('BANKNIFTY24DECFUT')).toBe('BANKNIFTY');
    expect(getUnderlying('RELIANCE')).toBe('RELIANCE');
    expect(getUnderlying('nifty')).toBe('NIFTY');
  });

  it('handles empty / undefined', () => {
    expect(getUnderlying('')).toBe('');
    expect(getUnderlying(undefined)).toBe('');
  });
});

describe('filterAlertsBySymbol', () => {
  const items = [A('NIFTY'), A('NIFTY24DEC24000CE'), A('SENSEX'), A('RELIANCE')];

  it("'all' returns everything", () => {
    expect(filterAlertsBySymbol(items, 'all', 'NIFTY')).toHaveLength(4);
  });

  it("'symbol' matches exact only", () => {
    expect(filterAlertsBySymbol(items, 'symbol', 'NIFTY').map((i) => i.symbol)).toEqual(['NIFTY']);
  });

  it("'underlying' matches the whole family", () => {
    expect(filterAlertsBySymbol(items, 'underlying', 'NIFTY').map((i) => i.symbol)).toEqual([
      'NIFTY',
      'NIFTY24DEC24000CE',
    ]);
  });

  it("'symbol' disambiguates by exchange when both are present", () => {
    const mixed = [A('NIFTY', 'NSE'), A('NIFTY', 'BSE')];
    const r = filterAlertsBySymbol(mixed, 'symbol', 'NIFTY', 'NSE');
    expect(r).toHaveLength(1);
    expect(r[0].exchange).toBe('NSE');
  });

  it('falls back to everything when no current symbol', () => {
    expect(filterAlertsBySymbol(items, 'symbol', undefined)).toHaveLength(4);
  });
});
