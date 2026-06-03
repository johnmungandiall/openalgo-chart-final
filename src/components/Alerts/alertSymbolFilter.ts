/**
 * Pure, UI-free helpers for scoping alerts/logs to the active chart symbol.
 * Used by the Alerts panel's "All / This symbol / This underlying" filter.
 */

export type SymbolFilterMode = 'all' | 'symbol' | 'underlying';

/** Anything carrying a symbol/exchange — covers both alerts and logs. */
export interface SymbolScoped {
  symbol?: string;
  exchange?: string;
}

/**
 * Underlying = the leading run of letters of a symbol, uppercased.
 * Groups an index with its options/futures:
 *   "NIFTY24DEC24000CE" -> "NIFTY"
 *   "BANKNIFTY24DECFUT"  -> "BANKNIFTY"
 *   "RELIANCE"           -> "RELIANCE"
 */
export function getUnderlying(symbol: string | undefined | null): string {
  if (!symbol) return '';
  const match = String(symbol).match(/^[A-Za-z]+/);
  return (match ? match[0] : String(symbol)).toUpperCase();
}

/**
 * Filter alerts/logs by the active chart symbol.
 * - 'all'        -> everything
 * - 'symbol'     -> exact symbol match (+ exchange when both sides specify one)
 * - 'underlying' -> same underlying family (index + its options/futures)
 *
 * When currentSymbol is missing there is nothing to scope to, so the list is
 * returned unchanged.
 */
export function filterAlertsBySymbol<T extends SymbolScoped>(
  items: T[],
  mode: SymbolFilterMode,
  currentSymbol: string | undefined,
  currentExchange?: string | undefined
): T[] {
  if (mode === 'all' || !currentSymbol) return items;

  const target = currentSymbol.toUpperCase();
  const targetUnderlying = getUnderlying(currentSymbol);

  return items.filter((item) => {
    const sym = (item.symbol || '').toUpperCase();

    if (mode === 'symbol') {
      if (sym !== target) return false;
      // Disambiguate by exchange only when both sides specify one.
      if (currentExchange && item.exchange) {
        return item.exchange.toUpperCase() === currentExchange.toUpperCase();
      }
      return true;
    }

    // mode === 'underlying'
    return getUnderlying(item.symbol) === targetUnderlying;
  });
}
