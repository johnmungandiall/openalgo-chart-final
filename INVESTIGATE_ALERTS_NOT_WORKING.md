# Indicator Alerts Not Working - Investigation Guide

## 🔍 Step-by-Step Investigation

### Step 1: Run This in Browser Console (F12)

Copy and paste this entire script into your browser console:

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

  console.log(`   Alert ${i+1}:`, reasons.length > 0 ? '❌ FILTERED: ' + reasons.join(', ') : '✅ Should be monitored');
});

// 6. Check globalAlertMonitor
console.log('6. globalAlertMonitor exists:', typeof globalAlertMonitor !== 'undefined');

console.log('=== END DEBUG INFO ===');
console.log('\nℹ️  Copy all output above and share for analysis');
```

---

## 📋 What to Look For

### ✅ Good Signs:
```
✅ debugAlerts available: true
✅ Is Running: true
✅ Has WebSocket: true
✅ Cached Alerts: 2
✅ OHLC Cache Size: 1
✅ Alert should be monitored
```

### ❌ Bad Signs (Problems):
```
❌ Is Running: false
❌ Has WebSocket: false
❌ Cached Alerts: 0 (but raw alerts exist)
❌ OHLC Cache Size: 0
❌ Alert FILTERED: Status is Triggered
❌ Alert FILTERED: Type is not indicator
```

---

## 🔧 Common Issues and Fixes

### Issue 1: "Is Running: false"
**Problem:** Monitor not started

**Fix:**
```javascript
// Check authentication
console.log('API Key exists:', !!localStorage.getItem('oa_api_key'));

// If no API key, set one (dummy for testing)
localStorage.setItem('oa_api_key', 'test-key');
location.reload();
```

### Issue 2: "Cached Alerts: 0" but raw alerts exist
**Problem:** Alerts are being filtered out

**Fix:**
```javascript
// Reset all alert statuses to Active
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.forEach(a => {
  a.status = 'Active';
  a.type = 'indicator';
  if (!a.created_at) a.created_at = Date.now();
});
localStorage.setItem('oa_alerts', JSON.stringify(alerts));
location.reload();
```

### Issue 3: "OHLC Cache Size: 0"
**Problem:** No historical data for indicator calculation

**Fix:**
1. Make sure chart is open with SENSEX symbol
2. Make sure chart interval matches alert interval (e.g., 1m)
3. Wait 5-10 seconds for data to load
4. Check again:
```javascript
debugAlerts.getDiagnostics().ohlcCacheSize
```

### Issue 4: "Type is not indicator"
**Problem:** Alert type field is wrong

**Fix:**
```javascript
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.forEach(a => {
  if (a.indicator) a.type = 'indicator';
});
localStorage.setItem('oa_alerts', JSON.stringify(alerts));
location.reload();
```

### Issue 5: "Status is Triggered"
**Problem:** Alert already triggered and marked as done

**Fix:**
```javascript
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.forEach(a => {
  if (a.status === 'Triggered') a.status = 'Active';
});
localStorage.setItem('oa_alerts', JSON.stringify(alerts));
location.reload();
```

---

## 🎯 Expected Console Logs When Working

When alerts are working correctly, you should see:

```
[GlobalAlertMonitor] Loaded 2 active alerts from storage
[GlobalAlertMonitor] Starting monitor for 1 symbols: [{symbol: 'SENSEX', exchange: 'BSE_INDEX'}]
[GlobalAlertMonitor] Price update SENSEX 72225.04 - checking 2 alerts
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1053 bars
[GlobalAlertMonitor] Calculating utBotAlerts for SENSEX with 1053 bars
```

When condition matches:
```
[GlobalAlertMonitor] Indicator alert triggered: {alertId: '...', condition: 'Buy Signal', ...}
🔔 UT Bot Buy Signal on SENSEX
✓ Webhook sent
```

---

## 🚨 If Still Not Working

### Complete Reset:
```javascript
// 1. Stop monitor
globalAlertMonitor.stop();

// 2. Clear all alerts
localStorage.removeItem('oa_alerts');

// 3. Reload page
location.reload();

// 4. After reload, create fresh test alert
debugAlerts.createTest('SENSEX', 'https://webhook.site/your-url');

// 5. Check status
debugAlerts.print();
```

---

## 📤 Share This Information

After running the debug script, copy and paste:
1. All console output from the debug script
2. Any error messages in red
3. Current logs showing "Calculating utBotAlerts"

This will help identify the exact issue!
