# Investigation Summary - Why Alerts Not Triggering

## 🔍 Code Analysis Complete

I've analyzed the alert system. Here's what I found:

### ✅ Alert System Components Working:

1. **Monitor Running** ✅
   - globalAlertMonitor is running
   - WebSocket connected
   - Price updates received

2. **Calculations Happening** ✅
   - UT Bot indicator calculating (2x for 2 alerts)
   - OHLC data available (1053 bars)
   - No errors in calculation

3. **Alert Evaluation Logic** ✅
   - `alertEvaluator.ts` - EQUALS condition implemented
   - Checks: `previousValue !== target && currentValue === target`
   - Only triggers when value **CHANGES TO** the target

### 🎯 The Key Issue

**UT Bot alerts use `EQUALS` condition:**
```typescript
// From alertConditions.ts line 543-558
{
  id: 'utbot_buy',
  type: ALERT_CONDITION_TYPES.EQUALS,
  label: 'Buy Signal',
  series: 'buy',
  value: true,  // Looking for buy: true
}
```

**EQUALS condition logic:**
```typescript
// From alertEvaluator.ts line 359-360
// Only trigger when value changes TO the target (not continuously while equal)
return previousValue !== target && currentValue === target;
```

This means:
- **Previous bar:** `buy: false` (or undefined)
- **Current bar:** `buy: true`
- **Then:** Alert triggers ✅

But if:
- **Previous bar:** `buy: true`
- **Current bar:** `buy: true`
- **Then:** No alert ❌ (already true, no change)

### 🔍 What's Probably Happening

Your UT Bot indicator is calculating, but:

1. **No new signal generated yet**
   - UT Bot hasn't generated a new Buy/Sell signal
   - Waiting for price to cross trailing stop
   - Current position unchanged

2. **Signal already happened**
   - Buy/Sell signal occurred before you created the alert
   - Alert waiting for NEXT signal

3. **Alert already triggered once**
   - If frequency is `only_once`, it's marked as 'Triggered'
   - Won't fire again

---

## 🚀 How to Test/Debug

### Step 1: Check Current UT Bot State

Run this in console:
```javascript
// Check what UT Bot is currently showing
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
const sensexAlerts = alerts.filter(a => a.symbol === 'SENSEX');
console.log('Your alerts:', sensexAlerts);

// Check if looking for buy or sell
sensexAlerts.forEach(a => {
  console.log('Alert condition:', a.condition);
  console.log('Looking for:', a.condition?.series, '=', a.condition?.value);
});
```

### Step 2: Manually Trigger Test

```javascript
// This will trigger immediately regardless of condition
debugAlerts.triggerTest('SENSEX', 'https://webhook.site/your-url');
```

You should see:
```
🔔 Triggering test alert
✓ Webhook sent
```

### Step 3: Check Alert Status

```javascript
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.filter(a => a.symbol === 'SENSEX').forEach(a => {
  console.log('Alert:', a.id);
  console.log('  Status:', a.status);
  console.log('  Frequency:', a.frequency);
  console.log('  Condition:', a.condition);
});
```

If status is 'Triggered', reset it:
```javascript
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.forEach(a => {
  if (a.symbol === 'SENSEX' && a.status === 'Triggered') {
    a.status = 'Active';
  }
});
localStorage.setItem('oa_alerts', JSON.stringify(alerts));
globalAlertMonitor.refresh();
console.log('✅ Alerts reset to Active');
```

### Step 4: Wait for Real Signal

For a real UT Bot signal to trigger:
1. Price must cross the trailing stop line
2. This generates a new Buy or Sell signal
3. Alert will trigger when `buy` changes from `false` to `true` (or `sell`)

---

## 💡 Most Likely Scenarios

### Scenario 1: Waiting for Signal (Most Likely)
```
Current state: No active Buy/Sell signal
Alert status: Active, monitoring
What's happening: Calculations running, waiting for price to cross trailing stop
Solution: Wait for price movement, or manually trigger test
```

### Scenario 2: Alert Already Triggered
```
Current state: Alert fired once
Alert status: 'Triggered'
What's happening: Alert marked as done, won't fire again
Solution: Reset status to 'Active' (see Step 3 above)
```

### Scenario 3: Wrong Condition
```
Current state: Looking for Buy, but Sell signal active (or vice versa)
Alert status: Active, monitoring
What's happening: Waiting for opposite signal
Solution: Check chart - is UT Bot showing buy or sell? Match alert condition
```

---

## 🎯 Quick Action Items

**To verify alerts are working:**

1. **Manual trigger test:**
   ```javascript
   debugAlerts.triggerTest('SENSEX', 'https://webhook.site/your-url');
   ```
   This proves webhook system works ✅

2. **Check alert status:**
   ```javascript
   debugAlerts.checkFiltering();
   ```
   This shows if alerts are being filtered ✅

3. **Reset if needed:**
   ```javascript
   const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
   alerts.forEach(a => { a.status = 'Active'; });
   localStorage.setItem('oa_alerts', JSON.stringify(alerts));
   globalAlertMonitor.refresh();
   ```

4. **Wait for real signal:**
   - Watch the chart
   - When UT Bot shows new Buy/Sell marker
   - Alert should trigger immediately

---

## 📋 Expected Behavior

When UT Bot generates a signal, you should see:

```
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1053 bars
[GlobalAlertMonitor] Indicator alert triggered: {
  alertId: '...',
  indicator: 'utBotAlerts',
  condition: 'Buy Signal',
  currentPrice: 72225.04
}
🔔 UT Bot Buy Signal on SENSEX
✓ Webhook sent
```

---

## 🆘 If Still Not Working

Please run this complete diagnostic and share output:

```javascript
console.log('=== COMPLETE DIAGNOSTIC ===');

// 1. Alert status
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
const sensexAlerts = alerts.filter(a => a.symbol === 'SENSEX');
console.log('1. SENSEX Alerts:', sensexAlerts);

// 2. Check filtering
const cutoff = Date.now() - (24 * 60 * 60 * 1000);
sensexAlerts.forEach((a, i) => {
  const reasons = [];
  if (a.created_at && a.created_at < cutoff) reasons.push('Too old');
  if (a.status === 'Triggered') reasons.push('Status: Triggered');
  if (a.status === 'Paused') reasons.push('Status: Paused');
  if (a.type !== 'indicator') reasons.push('Type not indicator');
  console.log(`Alert ${i+1}:`, reasons.length ? '❌ ' + reasons.join(', ') : '✅ Should work');
});

// 3. Monitor status
if (window.debugAlerts) {
  const diag = window.debugAlerts.getDiagnostics();
  console.log('2. Monitor:', {
    running: diag.isRunning,
    websocket: diag.hasWebSocket,
    cached: diag.cachedAlertsCount,
    ohlc: diag.ohlcCacheSize
  });
}

// 4. Test webhook
console.log('3. Testing webhook...');
debugAlerts.triggerTest('SENSEX', 'https://webhook.site/your-url');

console.log('=== END DIAGNOSTIC ===');
```

Share this output and I can pinpoint the exact issue!
