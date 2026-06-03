import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import globalAlertMonitor from '../services/globalAlertMonitor';

/**
 * Regression: "Once Per Bar Close" must evaluate the LAST CLOSED bar, not the
 * still-forming live bar. The chart updates the last OHLC element in place on
 * every tick, so ohlcData[n-1] is the forming candle. For once_per_bar_close the
 * monitor must drop it and evaluate ohlcData[n-2] (the just-closed bar), which is
 * immutable — eliminating intrabar repaint / false alerts.
 */

type Bar = { time: number; open: number; high: number; low: number; close: number; volume?: number };

function makeBars(n: number): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const base = 100 + i;
    bars.push({ time: 1000 + i * 300, open: base, high: base + 1, low: base - 1, close: base, volume: 10 });
  }
  return bars;
}

const SYMBOL = 'NIFTY';
const EXCHANGE = 'NSE';
const INTERVAL = '5m';

function seedAlert(frequency: string): void {
  const monitor = globalAlertMonitor as any;
  monitor._cachedAlerts = [
    {
      id: `test-${frequency}`,
      type: 'indicator',
      symbol: SYMBOL,
      exchange: EXCHANGE,
      indicator: 'utBotAlerts',
      interval: INTERVAL,
      frequency,
      condition: { type: 'equals', series: 'buy', value: true, label: 'Buy Signal' },
      params: { keyValues: 1, atrPeriod: 10 },
    },
  ];
  // Keep the cache "fresh" so _getAlerts() doesn't reload from (empty) localStorage.
  monitor._lastCacheRefresh = Date.now();
}

describe('GlobalAlertMonitor — once_per_bar_close evaluates the closed bar', () => {
  const monitor = globalAlertMonitor as any;
  const bars = makeBars(5); // bars[4] = live/forming, bars[3] = last closed
  let calcSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    monitor._ohlcCache.clear();
    monitor._alertTriggerTimes.clear();
    monitor._previousIndicatorValues.clear();
    monitor._lastPrices.clear();
    monitor.updateOHLCData(SYMBOL, EXCHANGE, INTERVAL, bars);
    // We only assert WHICH slice is fed in, so the indicator result is irrelevant.
    calcSpy = vi.spyOn(monitor._indicatorDataManager, 'calculateIndicator').mockResolvedValue(null);
  });

  afterEach(() => {
    calcSpy.mockRestore();
  });

  it('once_per_bar_close: drops the live forming bar (evaluates the last CLOSED bar)', async () => {
    seedAlert('once_per_bar_close');

    await monitor._onPriceUpdate({ symbol: SYMBOL, exchange: EXCHANGE, last: 104 });

    expect(calcSpy).toHaveBeenCalledTimes(1);
    const passed = calcSpy.mock.calls[0][2] as Bar[];
    expect(passed).toHaveLength(bars.length - 1);
    // Last evaluated bar must be the previously-closed bar, NOT the forming bar.
    expect(passed[passed.length - 1].time).toBe(bars[bars.length - 2].time);
  });

  it('once_per_bar: keeps the live forming bar (intrabar — unchanged behaviour)', async () => {
    seedAlert('once_per_bar');

    await monitor._onPriceUpdate({ symbol: SYMBOL, exchange: EXCHANGE, last: 104 });

    expect(calcSpy).toHaveBeenCalledTimes(1);
    const passed = calcSpy.mock.calls[0][2] as Bar[];
    expect(passed).toHaveLength(bars.length);
    expect(passed[passed.length - 1].time).toBe(bars[bars.length - 1].time);
  });
});
