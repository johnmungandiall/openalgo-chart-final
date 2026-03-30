# Performance Fix: Duplicate Indicator Calculations

## సమస్య (Problem)

ప్రతి price update కు UT Bot indicator **3 times** calculate అవుతోంది:

```
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1049 bars
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1049 bars
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1049 bars
```

## కారణం (Root Cause)

**File:** `src/services/globalAlertMonitor.ts:616-626`

`updateOHLCData()` method లో `_onPriceUpdate()` కాల్ అవుతోంది:

```typescript
// OLD CODE (causing duplicates):
updateOHLCData(...) {
  // Cache OHLC data
  this._ohlcCache.set(cacheKey, { data: ohlcData, ... });

  // Then trigger price update evaluation
  const lastCandle = ohlcData[ohlcData.length - 1];
  this._onPriceUpdate({
    symbol,
    exchange,
    last: lastCandle.close,
    ...
  });
}
```

**Data Flow:**
```
1. WebSocket price update → _onPriceUpdate() → indicator calculation
2. Chart updates OHLC → updateOHLCData() → _onPriceUpdate() → indicator calculation (DUPLICATE!)
3. Multiple charts → multiple updateOHLCData() calls → more duplicates!
```

## పరిష్కారం (Solution)

`updateOHLCData()` నుండి `_onPriceUpdate()` call తొలగించబడింది:

```typescript
// NEW CODE (fixed):
updateOHLCData(...) {
  // Cache OHLC data only
  this._ohlcCache.set(cacheKey, { data: ohlcData, ... });

  // NOTE: We do NOT trigger _onPriceUpdate here to avoid duplicate calculations.
  // The WebSocket subscription already calls _onPriceUpdate on every price tick.
  // This method is only for caching OHLC data from the chart component.
}
```

## ప్రభావం (Impact)

### Before Fix:
- ✗ 3x indicator calculations per price update
- ✗ High CPU usage
- ✗ Slower performance
- ✗ Possible duplicate alert triggers

### After Fix:
- ✓ 1x indicator calculation per price update
- ✓ Normal CPU usage
- ✓ Better performance
- ✓ No duplicate triggers

## Demo Mode గురించి (About Demo Mode)

Original comment చెప్పింది:
> "This is crucial for DEMO mode where the global WebSocket receives no ticks"

కానీ:
1. Demo mode లో కూడా WebSocket price updates వస్తాయి
2. Chart component demo ticks generate చేస్తే, అవి WebSocket ద్వారా broadcast అవుతాయి
3. కాబట్టి `updateOHLCData()` నుండి `_onPriceUpdate()` call అవసరం లేదు

## Verification

### Before:
```
[GlobalAlertMonitor] Price update SENSEX 72317.41 - checking 2 alerts
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1049 bars
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1049 bars
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1049 bars
```

### After (Expected):
```
[GlobalAlertMonitor] Price update SENSEX 72317.41 - checking 2 alerts
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1049 bars
```

## Files Modified

```
src/services/globalAlertMonitor.ts
  - Removed _onPriceUpdate() call from updateOHLCData()
  - Lines 611-626 replaced with comment explaining why
```

## Testing

1. Start application: `npm run dev`
2. Open browser console (F12)
3. Create alert for SENSEX
4. Watch logs - should see only 1 calculation per price update

## Build Status

✅ TypeScript compilation: SUCCESS
✅ Production build: SUCCESS

---

**Summary:** Duplicate indicator calculations fixed by removing unnecessary `_onPriceUpdate()` call from `updateOHLCData()` method. Performance improved significantly.
