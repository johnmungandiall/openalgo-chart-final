# Quick Investigation - Run This Now

## 🚀 Copy and Paste This Into Browser Console (F12)

```javascript
console.log('=== ALERT DEBUG INFO ===');

// 1. Check if debugAlerts is available
console.log('1. debugAlerts available:', typeof window.debugAlerts !== 'undefined');

// 2. Get diagnostics
if (window.debugAlerts) {
  const diag = window.debugAlerts.getDiagnostics();
  console.log('2. Diagnostics:', diag);
  console.log('   - Is Running:', diag.isRunning);
  console.log('   - Has WebSocket:', diag.hasWebSocket);
  console.log('   - Cached Alerts:', diag.cachedAlertsCount);
  console.log('   - OHLC Cache Size:', diag.ohlcCacheSize);
} else {
  console.log('2. debugAlerts not loaded - check if in dev mode');
}

// 3. Check raw alerts in localStorage
const rawAlerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
console.log('3. Raw alerts from storage:', rawAlerts);
console.log('   Total alerts:', rawAlerts.length);

// 4. Check SENSEX alerts specifically
const sensexAlerts = rawAlerts.filter(a => a.symbol === 'SENSEX');
console.log('4. SENSEX alerts:', sensexAlerts);
sensexAlerts.forEach((alert, i) => {
  console.log(`   Alert ${i+1}:`, {
    id: alert.id,
    type: alert.type,
    indicator: alert.indicator,
    status: alert.status,
    frequency: alert.frequency,
    condition: alert.condition,
    webhookUrl: alert.webhookUrl ? 'SET' : 'NOT SET',
    created_at: alert.created_at ? new Date(alert.created_at).toLocaleString() : 'N/A'
  });
});

// 5. Check if alerts are being filtered
console.log('5. Filtering check:');
const cutoff = Date.now() - (24 * 60 * 60 * 1000);
sensexAlerts.forEach((alert, i) => {
  const reasons = [];
  if (alert.created_at && alert.created_at < cutoff) reasons.push('Too old (>24h)');
  if (alert.status === 'Triggered') reasons.push('Status is Triggered');
  if (alert.status === 'Paused') reasons.push('Status is Paused');
  if (alert.type !== 'indicator') reasons.push('Type is not indicator');
  if (!alert.indicator) reasons.push('No indicator specified');

  console.log(`   Alert ${i+1}:`, reasons.length > 0 ? '❌ FILTERED: ' + reasons.join(', ') : '✅ Should be monitored');
});

// 6. Check globalAlertMonitor
console.log('6. globalAlertMonitor exists:', typeof globalAlertMonitor !== 'undefined');

// 7. Check if indicator calculation is happening
console.log('7. Recent logs (check above for):');
console.log('   - "Loaded X active alerts from storage"');
console.log('   - "Starting monitor for X symbols"');
console.log('   - "Calculating utBotAlerts for SENSEX"');
console.log('   - "Indicator alert triggered" (if condition met)');

console.log('\n=== END DEBUG INFO ===');
console.log('\n📋 COPY ALL OUTPUT ABOVE AND SHARE');
```

---

## 🔍 What I Need From You

After running the script above, please share:

1. **The complete console output** from the debug script
2. **Any errors** in red in the console
3. **Answer these questions:**
   - Do you see "Calculating utBotAlerts" in the logs? (Yes/No)
   - Do you see "Indicator alert triggered"? (Yes/No)
   - What is the alert condition? (Buy Signal / Sell Signal / etc.)
   - Is the condition currently true on the chart? (Is UT Bot showing buy/sell signal?)

---

## 🎯 Most Likely Issues

Based on your logs showing calculations happening, the issue is probably:

### 1. Condition Not Met Yet
- UT Bot calculations are happening ✅
- But the condition (Buy Signal / Sell Signal) hasn't occurred yet
- **Solution:** Wait for the condition to happen, or manually trigger test

### 2. Alert Already Triggered (status = 'Triggered')
- Alert fired once and stopped
- **Solution:** Reset status to 'Active'

### 3. Webhook URL Not Set
- Alert triggers but no webhook configured
- **Solution:** Add webhook URL to alert

### 4. Alert Type Wrong
- Alert exists but type is not 'indicator'
- **Solution:** Fix type field

---

## 🚨 Quick Fixes

### Fix 1: Reset Alert Status
```javascript
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.forEach(a => {
  if (a.symbol === 'SENSEX') {
    a.status = 'Active';
    a.type = 'indicator';
    console.log('Reset alert:', a.id);
  }
});
localStorage.setItem('oa_alerts', JSON.stringify(alerts));
console.log('✅ Alerts reset. Refresh monitor...');
globalAlertMonitor.refresh();
```

### Fix 2: Manually Trigger Test Alert
```javascript
// This will trigger a test alert immediately
debugAlerts.triggerTest('SENSEX', 'https://webhook.site/your-url');
```

### Fix 3: Check What Condition Is Set
```javascript
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
const sensexAlerts = alerts.filter(a => a.symbol === 'SENSEX');
sensexAlerts.forEach(a => {
  console.log('Alert condition:', a.condition);
  console.log('Alert type:', a.alert_type);
  console.log('Indicator:', a.indicator);
});
```

---

## 📊 Expected vs Actual

### Expected (Working):
```
✅ Is Running: true
✅ Has WebSocket: true
✅ Cached Alerts: 2
✅ OHLC Cache Size: 1
✅ Alert should be monitored
✅ Calculating utBotAlerts (happening)
✅ Indicator alert triggered (when condition met)
✅ Webhook sent
```

### What You're Seeing:
```
✅ Calculating utBotAlerts (happening)
❌ Indicator alert triggered (NOT happening)
❌ Webhook sent (NOT happening)
```

This means:
- Monitor is working ✅
- Calculations are happening ✅
- **But condition is not being met** ❌

---

## 🎯 Next Steps

1. **Run the debug script** (copy from top of this file)
2. **Share the output** with me
3. **Check your alert condition** - is it currently true on the chart?
4. **Try manual trigger** to test webhook:
   ```javascript
   debugAlerts.triggerTest('SENSEX', 'https://webhook.site/your-url');
   ```

This will help me identify the exact issue!
