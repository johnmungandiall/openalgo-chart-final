# Issue: Webhook Not Sending on UT Bot Indicator Alert Trigger

## Summary

When a UT Bot (or other indicator) alert triggers with a configured webhook URL, the webhook POST request may not fire. Root cause analysis reveals **5 bugs** across 3 files that collectively break the indicator alert -> webhook pipeline.

---

## Bug #1 (CRITICAL): All Indicator Alerts Marked "Triggered" Regardless of Frequency

**File:** `src/App.tsx` lines 296-299
**Impact:** After the first trigger, the alert is permanently disabled — no further webhook calls.

```javascript
// CURRENT (broken): Always sets status to 'Triggered'
if (evt.alertType === 'indicator' && evt.alertId) {
    setAlerts(prev => prev.map(a =>
        a.id === evt.alertId ? { ...a, status: 'Triggered' } : a
    ));
}
```

The `globalAlertMonitor._loadAlertsFromStorage()` filters out alerts with `status === 'Triggered'`:
```javascript
if (alert.status === 'Triggered' || alert.status === 'Paused') continue;
```

So after ONE trigger, the alert is excluded from all future monitoring — even for `once_per_bar` and `every_time` frequencies which should keep firing.

**Fix:** Only mark as 'Triggered' for `only_once` frequency:
```javascript
if (evt.alertType === 'indicator' && evt.alertId) {
    // The globalAlertMonitor already handles only_once via _markIndicatorAlertTriggered
    // Only update React state for only_once alerts
    if (evt.frequency === 'only_once') {
        setAlerts(prev => prev.map(a =>
            a.id === evt.alertId ? { ...a, status: 'Triggered' } : a
        ));
    }
}
```

**Also required:** Pass `frequency` in the trigger event from `globalAlertMonitor._checkIndicatorAlert()`.

---

## Bug #2 (CRITICAL): Trigger Event Missing `currentPrice` for Indicator Alerts

**File:** `src/services/globalAlertMonitor.ts` lines 410-421
**Impact:** Webhook payload always has `price: 0`. Some webhook receivers may reject payloads with zero price or use it for order logic, causing incorrect behavior.

```javascript
// CURRENT: Missing currentPrice in the returned event
return {
    alertId: alert.id,
    symbol: alert.symbol,
    exchange: alert.exchange,
    alertType: 'indicator',
    indicator: alert.indicator,
    condition: condition.label,
    conditionType: condition.type,
    timestamp: Date.now(),
    message: alert.message || `${alert.indicator} ${condition.label}`,
    webhookUrl: alert.webhookUrl,
    // currentPrice is NOT included!
};
```

In `App.tsx`, the webhook payload uses `evt.currentPrice || 0` (line 307), which resolves to `0`.

**Fix:** Add `currentPrice` to the returned trigger event:
```javascript
return {
    alertId: alert.id,
    symbol: alert.symbol,
    exchange: alert.exchange,
    alertType: 'indicator',
    indicator: alert.indicator,
    condition: condition.label,
    conditionType: condition.type,
    timestamp: Date.now(),
    message: alert.message || `${alert.indicator} ${condition.label}`,
    webhookUrl: alert.webhookUrl,
    currentPrice: currentPrice,  // ADD THIS
};
```

---

## Bug #3 (MODERATE): Recursive `_onPriceUpdate` Call via `_fetchAndCacheOHLCData`

**File:** `src/services/globalAlertMonitor.ts` lines 688-698
**Impact:** When OHLC data is fetched on-demand, `_fetchAndCacheOHLCData` calls `updateOHLCData`, which calls `_onPriceUpdate` again. This creates a re-entrant call that processes the same indicator alerts twice with potentially inconsistent `_previousIndicatorValues` state. Can cause:
- Duplicate webhook sends
- First trigger correctly fires but second re-entrant trigger overwrites `_previousIndicatorValues`, preventing future detection
- Unpredictable evaluation behavior

```javascript
// _fetchAndCacheOHLCData calls:
this.updateOHLCData(symbol, exchange, interval, data);  // line 691

// updateOHLCData calls:
this._onPriceUpdate({ symbol, exchange, last: lastCandle.close, ... });  // line 613

// _onPriceUpdate is the caller! -> recursion
```

**Fix:** In `_fetchAndCacheOHLCData`, cache the data directly without calling `updateOHLCData` (which triggers the re-entrant evaluation):
```javascript
private async _fetchAndCacheOHLCData(...): Promise<OHLCBar[] | null> {
    // ...
    const data = await getKlines(symbol, exchange, interval, 1000);
    if (data && data.length > 0) {
        // Cache directly instead of calling updateOHLCData (which triggers _onPriceUpdate)
        const normalizedInterval = this._normalizeInterval(interval);
        const cacheKey = `${symbol}:${exchange}:${normalizedInterval}`;
        const now = Date.now();
        this._ohlcCache.set(cacheKey, {
            data: data as OHLCBar[],
            timestamp: now,
            lastAccessed: now,
        });
        return data as OHLCBar[];
    }
    return null;
}
```

---

## Bug #4 (MINOR): Webhook Direction Always "up" for Indicator Alerts

**File:** `src/App.tsx` line 308
**Impact:** Webhook payload always reports direction as "up", even for sell signals.

```javascript
// CURRENT: Both branches return 'up'
direction: (evt.conditionType === 'equals' ? 'up' : 'up') as 'up' | 'down',
```

**Fix:** Map UT Bot condition to proper direction:
```javascript
direction: (evt.conditionType === 'equals'
    ? (evt.condition?.includes('Sell') ? 'down' : 'up')
    : 'up') as 'up' | 'down',
```

---

## Bug #5 (MINOR): Trigger Event Missing `frequency` Field

**File:** `src/services/globalAlertMonitor.ts` lines 410-421
**Impact:** The trigger event doesn't carry the alert's `frequency` field. This is needed by Bug #1's fix to conditionally mark alerts as 'Triggered'. Also useful for webhook receivers to know the alert type.

**Fix:** Add `frequency` to the trigger event:
```javascript
return {
    // ... existing fields ...
    frequency: alert.frequency,  // ADD THIS
};
```

Also update the `AlertTriggerEvent` interface to include `frequency`:
```typescript
export interface AlertTriggerEvent {
    // ... existing fields ...
    frequency?: 'once_per_bar' | 'every_time' | 'only_once' | 'once_per_bar_close' | undefined;
}
```

---

## Files to Modify

| File | Bugs | Priority |
|------|------|----------|
| `src/App.tsx` | #1, #4 | CRITICAL |
| `src/services/globalAlertMonitor.ts` | #2, #3, #5 | CRITICAL |

---

## Data Flow Diagram

```
IndicatorAlertDialog.tsx
  |-- handleSave() creates alert with webhookUrl
  |
useIndicatorAlertHandlers.ts
  |-- setAlerts() -> AlertContext persists to localStorage (STORAGE_KEYS.ALERTS)
  |-- globalAlertMonitor.refresh()
  |
globalAlertMonitor.ts
  |-- _loadAlertsFromStorage() reads alerts with webhookUrl
  |-- _onPriceUpdate() evaluates indicator conditions
  |-- _checkIndicatorAlert() returns trigger event with webhookUrl
  |-- _onTrigger(triggerEvent) callback fires
  |
App.tsx (handleBackgroundAlertTrigger)
  |-- Shows toast notification
  |-- [BUG #1] Sets status='Triggered' for ALL frequencies
  |-- if (evt.webhookUrl) -> sendWebhook()
  |     [BUG #2] price is always 0 (currentPrice missing from event)
  |     [BUG #4] direction is always 'up'
  |
webhookService.ts
  |-- sendWebhook(url, payload) -> fetch POST
```

---

## Testing Checklist

- [ ] Create UT Bot alert with webhook URL -> verify webhook fires on signal
- [ ] Verify webhook payload has correct `price` (not 0)
- [ ] Verify webhook payload has correct `direction` (up for buy, down for sell)
- [ ] Verify `once_per_bar` alerts continue monitoring after first trigger
- [ ] Verify `every_time` alerts continue monitoring after first trigger
- [ ] Verify `only_once` alerts stop after first trigger
- [ ] Verify no duplicate webhook sends (recursive call fix)
- [ ] Test with other indicator alerts (RSI, MACD) to confirm webhook works
