/**
 * Indicator calculation parameter keys (alert-capable indicators).
 *
 * Single source of truth used to:
 *  1. Capture the LIVE indicator settings onto an indicator alert when it is
 *     created (so the alert evaluates with the same params shown on the chart),
 *     and
 *  2. Feed those params back into IndicatorDataManager.calculateIndicator /
 *     the indicator Web Worker during alert evaluation.
 *
 * Keys MUST match both:
 *  - the indicator object fields stored on the chart (see indicatorConfigs.ts `inputs`), and
 *  - the option names consumed by the worker / calc functions (see indicatorWorker.ts).
 *
 * Keyed by the canonical indicator id (same value as `alert.indicator` and the
 * dialog's `selectedIndicator`), e.g. 'utBotAlerts', 'bollingerBands'.
 */
export const INDICATOR_PARAM_KEYS: Record<string, string[]> = {
  rsi: ['period'],
  macd: ['fast', 'slow', 'signal'],
  bollingerBands: ['period', 'stdDev'],
  stochastic: ['kPeriod', 'dPeriod', 'smooth'],
  supertrend: ['period', 'multiplier'],
  sma: ['period'],
  ema: ['period'],
  atr: ['period'],
  utBotAlerts: ['keyValues', 'atrPeriod'],
};

/**
 * Pull the calculation params for an indicator out of a source object
 * (typically the live chart indicator object). Only finite numeric values for
 * the indicator's known keys are kept — everything else (colors, flags, etc.)
 * is ignored.
 *
 * @param indicatorId Canonical indicator id (e.g. 'utBotAlerts')
 * @param source      The chart indicator object to read params from
 * @returns A clean params object, e.g. { keyValues: 1, atrPeriod: 300 }
 */
export function extractIndicatorParams(
  indicatorId: string,
  source: Record<string, unknown> | null | undefined
): Record<string, number> {
  const keys = INDICATOR_PARAM_KEYS[indicatorId];
  const params: Record<string, number> = {};
  if (!keys || !source) return params;

  for (const key of keys) {
    const val = source[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      params[key] = val;
    }
  }
  return params;
}
