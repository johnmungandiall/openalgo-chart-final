# అలర్ట్‌లు రావడం లేదు - పూర్తి డీబగ్ గైడ్

## 🚨 సమస్య: ఇండికేటర్ అలర్ట్‌లు ట్రిగ్గర్ అవ్వడం లేదు

ఈ గైడ్ మీకు అలర్ట్ సమస్యలను గుర్తించడానికి మరియు పరిష్కరించడానికి సహాయపడుతుంది.

---

## 📋 త్వరిత చెక్‌లిస్ట్

మొదట ఈ విషయాలు చెక్ చేయండి:

- [ ] మీరు అలర్ట్ సృష్టించారా? (IndicatorAlertDialog ద్వారా)
- [ ] Webhook URL సరిగ్గా ఉందా? (https:// తో start అవ్వాలి)
- [ ] Alert status "Active" గా ఉందా? ("Triggered" లేదా "Paused" కాదు)
- [ ] Chart ఓపెన్ అయి ఉందా? (OHLC డేటా కోసం అవసరం)
- [ ] మీరు authenticated గా ఉన్నారా? (API key సెట్ చేయబడిందా)
- [ ] Chart interval మరియు alert interval match అవుతున్నాయా?

---

## 🔧 డీబగ్ టూల్స్ ఉపయోగించడం

### స్టెప్ 1: Browser Console ఓపెన్ చేయండి

**F12** నొక్కండి లేదా Right-click → "Inspect" → "Console" ట్యాబ్

### స్టెప్ 2: Debug Mode ఎనేబుల్ చేయండి

Console లో ఈ కమాండ్ రన్ చేయండి:

```javascript
debugAlerts.enableDebug();
location.reload();
```

ఇది అన్ని debug లాగ్స్ చూపిస్తుంది.

### స్టెప్ 3: Diagnostics రన్ చేయండి

```javascript
debugAlerts.print();
```

ఇది మీకు పూర్తి స్థితి రిపోర్ట్ ఇస్తుంది:

```
╔════════════════════════════════════════════════════════════╗
║         ALERT MONITOR DIAGNOSTICS                          ║
╚════════════════════════════════════════════════════════════╝

📊 Monitor Status:
  • Is Running: ✅ YES / ❌ NO
  • WebSocket: ✅ Connected / ❌ Not connected

🔔 Alerts:
  • Cached Alerts: X
  • Raw Alerts in Storage: Y

📈 Data:
  • OHLC Cache Size: X symbol-intervals
  • Last Prices Tracked: Y symbols
```

---

## 🔍 సాధారణ సమస్యలు మరియు పరిష్కారాలు

### సమస్య 1: "Is Running: ❌ NO"

**అర్థం:** Alert monitor start కాలేదు

**కారణాలు:**
1. మీరు authenticated కాలేదు (API key లేదు)
2. ఏ alerts లేవు
3. Application ఇప్పుడే లోడ్ అయింది (1 సెకను వేచి ఉండండి)

**పరిష్కారం:**

```javascript
// Check authentication
console.log('API Key exists:', !!localStorage.getItem('oa_api_key'));

// Manually start monitor
debugAlerts.createTest('NIFTY', 'https://webhook.site/your-url');
```

---

### సమస్య 2: "Cached Alerts: 0" కానీ "Raw Alerts: X"

**అర్థం:** Alerts storage లో ఉన్నాయి కానీ monitor వాటిని ignore చేస్తోంది

**కారణాలు:**
1. Alert status "Triggered" లేదా "Paused"
2. Alert 24 hours కంటే పాతది
3. Alert type "indicator" కాదు

**పరిష్కారం:**

```javascript
// Check why alerts are filtered
debugAlerts.checkFiltering();
```

ఇది ప్రతి alert ఎందుకు filtered out అయిందో చూపిస్తుంది:

```
📋 Alert 1: alert-123
  Symbol: NIFTY
  Type: indicator
  Status: Triggered
  🚫 FILTERED OUT:
     ❌ Status is "Triggered"
```

**Fix చేయడానికి:**

```javascript
// Reset alert status to Active
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.forEach(a => {
  if (a.status === 'Triggered') a.status = 'Active';
});
localStorage.setItem('oa_alerts', JSON.stringify(alerts));
location.reload();
```

---

### సమస్య 3: "WebSocket: ❌ Not connected"

**అర్థం:** Price updates రావడం లేదు

**కారణాలు:**
1. ఏ symbols monitor చేయడానికి లేవు
2. WebSocket connection విఫలమైంది
3. Network సమస్య

**పరిష్కారం:**

```javascript
// Check if price updates are coming
const stopMonitoring = debugAlerts.monitorPrices(30000); // 30 seconds

// మీరు ఇలా చూడాలి:
// [1] Price update: { symbol: 'NIFTY', exchange: 'NSE', price: 22450.75 }
// [2] Price update: { symbol: 'NIFTY', exchange: 'NSE', price: 22451.00 }
```

ఏ updates రావడం లేదంటే:
- Chart లో symbol ఓపెన్ చేయండి
- WebSocket reconnect అవ్వడానికి page reload చేయండి

---

### సమస్య 4: "OHLC Cache Size: 0"

**అర్థం:** Indicator calculations కోసం historical data లేదు

**కారణాలు:**
1. Chart ఓపెన్ కాలేదు
2. Chart interval alert interval తో match కాలేదు
3. Chart ఇంకా డేటా లోడ్ చేయలేదు

**పరిష్కారం:**

1. Chart ఓపెన్ చేయండి మరియు alert symbol select చేయండి
2. Chart interval ని alert interval కు మార్చండి (ఉదా: 1m)
3. కొన్ని సెకన్లు వేచి ఉండండి chart డేటా లోడ్ అవ్వడానికి

```javascript
// Check OHLC cache after opening chart
setTimeout(() => {
  const diag = debugAlerts.getDiagnostics();
  console.log('OHLC Cache Size:', diag.ohlcCacheSize);
}, 5000);
```

---

### సమస్య 5: Alerts ట్రిగ్గర్ అవుతున్నాయి కానీ Webhook పంపబడటం లేదు

**చెక్ చేయండి:**

```javascript
// Check if webhook URL is set
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.forEach(a => {
  console.log('Alert:', a.id);
  console.log('  Webhook URL:', a.webhookUrl || '❌ NOT SET');
});
```

**Webhook URL add చేయడానికి:**

```javascript
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.forEach(a => {
  a.webhookUrl = 'https://webhook.site/your-unique-url';
});
localStorage.setItem('oa_alerts', JSON.stringify(alerts));
globalAlertMonitor.refresh();
```

---

### సమస్య 6: Webhook పంపబడుతోంది కానీ endpoint కు రావడం లేదు

**చెక్ చేయండి:**

1. **Webhook URL valid గా ఉందా?**
   - https:// తో start అవ్వాలి
   - Webhook.site లేదా RequestBin వంటి test service ఉపయోగించండి

2. **Console లో errors ఉన్నాయా?**
   ```javascript
   // Look for:
   // ✗ Webhook failed: ...
   // ✗ Webhook error: ...
   ```

3. **CORS issues ఉన్నాయా?**
   - మీ webhook endpoint CORS allow చేయాలి
   - లేదా localhost నుండి మాత్రమే పంపగలరు

**Test webhook manually:**

```javascript
debugAlerts.triggerTest('NIFTY', 'https://webhook.site/your-url');
```

Console లో చూడండి:
```
🔔 Triggering test alert: {...}
✅ Test alert triggered successfully
✓ Webhook sent
```

---

## 🧪 టెస్ట్ అలర్ట్ సృష్టించడం

### Method 1: Debug Tool ఉపయోగించి

```javascript
// Create test alert that triggers on every price update
debugAlerts.createTest('NIFTY', 'https://webhook.site/your-url');
```

### Method 2: Manual Creation

```javascript
const testAlert = {
  id: 'test-' + Date.now(),
  symbol: 'NIFTY',
  exchange: 'NSE',
  type: 'indicator',
  indicator: 'UT Bot',
  interval: '1m',
  alert_type: 'indicator_condition',
  condition: { type: 'equals', label: 'Buy Signal' },
  frequency: 'every_time', // ప్రతి టిక్‌కు ట్రిగ్గర్ అవుతుంది
  message: 'Test Alert',
  webhookUrl: 'https://webhook.site/your-unique-url',
  status: 'Active',
  created_at: Date.now()
};

const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.push(testAlert);
localStorage.setItem('oa_alerts', JSON.stringify(alerts));
globalAlertMonitor.refresh();
```

---

## 📊 రియల్-టైం మానిటరింగ్

### Price Updates చూడండి

```javascript
// Monitor for 30 seconds
const stop = debugAlerts.monitorPrices(30000);

// Stop manually if needed
stop();
```

### Alert Triggers చూడండి

Console లో ఈ లాగ్స్ కోసం చూడండి:

```
[GlobalAlertMonitor] Price update NIFTY 22450.75 - checking 1 alerts
[GlobalAlertMonitor] Calculating UT Bot for NIFTY with 100 bars
[GlobalAlertMonitor] Indicator alert triggered: {...}
🔔 Test Alert
✓ Webhook sent
```

---

## 🔄 సాధారణ పరిష్కారాలు

### పరిష్కారం 1: Monitor Restart

```javascript
globalAlertMonitor.stop();
setTimeout(() => {
  globalAlertMonitor.start((evt) => console.log('Alert:', evt));
}, 1000);
```

### పరిష్కారం 2: Clear Cache మరియు Reload

```javascript
// Clear OHLC cache
globalAlertMonitor._ohlcCache.clear();
globalAlertMonitor.refresh();
```

### పరిష్కారం 3: Reset All Alerts

```javascript
// ⚠️ ఇది అన్ని alerts delete చేస్తుంది!
debugAlerts.clearAll();

// తర్వాత కొత్త test alert సృష్టించండి
debugAlerts.createTest('NIFTY', 'https://webhook.site/your-url');
```

### పరిష్కారం 4: Complete Reset

```javascript
// 1. Stop monitor
globalAlertMonitor.stop();

// 2. Clear all data
localStorage.removeItem('oa_alerts');
localStorage.removeItem('oa_chart_alerts');

// 3. Reload page
location.reload();

// 4. Create fresh test alert
debugAlerts.createTest('NIFTY', 'https://webhook.site/your-url');
```

---

## 📝 Diagnostics Export చేయడం

సహాయం కోసం ఈ information share చేయండి:

```javascript
// Copy this output
const diag = debugAlerts.getDiagnostics();
console.log(JSON.stringify(diag, null, 2));
```

---

## 🎯 Step-by-Step Troubleshooting

### స్టెప్ 1: Basic Checks

```javascript
debugAlerts.print();
```

చూడండి:
- ✅ Is Running: YES
- ✅ WebSocket: Connected
- ✅ Cached Alerts: > 0

### స్టెప్ 2: Check Alert Filtering

```javascript
debugAlerts.checkFiltering();
```

అన్ని alerts "✅ Should be monitored" అని చూపించాలి.

### స్టెప్ 3: Monitor Price Updates

```javascript
debugAlerts.monitorPrices(10000); // 10 seconds
```

Price updates రావాలి. రాకపోతే:
- Chart ఓపెన్ చేయండి
- Symbol select చేయండి
- Page reload చేయండి

### స్టెప్ 4: Check OHLC Data

```javascript
const diag = debugAlerts.getDiagnostics();
console.log('OHLC Cache:', diag.ohlcCacheSize);
```

0 అయితే:
- Chart ఓపెన్ చేయండి
- Alert symbol select చేయండి
- Alert interval కు chart interval మార్చండి
- 5-10 సెకన్లు వేచి ఉండండి

### స్టెప్ 5: Test Webhook

```javascript
debugAlerts.triggerTest('NIFTY', 'https://webhook.site/your-url');
```

Webhook.site లో request వచ్చిందా చెక్ చేయండి.

### స్టెప్ 6: Create Real Alert

UI ద్వారా alert సృష్టించండి:
1. Chart మీద right-click → "Create Alert"
2. Indicator: UT Bot
3. Condition: Buy Signal
4. Frequency: every_time (testing కోసం)
5. Webhook URL: మీ URL
6. Save

### స్టెప్ 7: Wait for Trigger

Console లో చూడండి:
```
[GlobalAlertMonitor] Indicator alert triggered
🔔 [Alert message]
✓ Webhook sent
```

---

## 🆘 ఇంకా పని చేయడం లేదా?

### అన్ని debug info collect చేయండి:

```javascript
console.log('=== COMPLETE DIAGNOSTICS ===');
debugAlerts.print();
console.log('\n=== ALERT FILTERING ===');
debugAlerts.checkFiltering();
console.log('\n=== RAW DATA ===');
console.log('Alerts:', JSON.parse(localStorage.getItem('oa_alerts') || '[]'));
console.log('Log Level:', localStorage.getItem('oa_log_level'));
console.log('API Key exists:', !!localStorage.getItem('oa_api_key'));
```

ఈ output copy చేసి issue report చేయండి.

---

## 💡 ముఖ్యమైన టిప్స్

1. **Debug mode ఎల్లప్పుడూ ఎనేబుల్ చేయండి** troubleshooting చేసేటప్పుడు
2. **Test alerts ఉపయోగించండి** `frequency: 'every_time'` తో
3. **Webhook.site ఉపయోగించండి** webhook testing కోసం
4. **Console ఎల్లప్పుడూ ఓపెన్ గా ఉంచండి** errors చూడడానికి
5. **Chart ఓపెన్ చేయండి** indicator alerts పని చేయడానికి
6. **Patience** - కొన్నిసార్లు first trigger రావడానికి కొన్ని నిమిషాలు పడుతుంది

---

## 🔗 ఉపయోగకరమైన Commands

```javascript
// Quick diagnostics
debugAlerts.print();

// Enable all logs
debugAlerts.enableDebug(); location.reload();

// Create test alert
debugAlerts.createTest('NIFTY', 'https://webhook.site/xxx');

// Trigger test webhook
debugAlerts.triggerTest('NIFTY', 'https://webhook.site/xxx');

// Monitor prices
debugAlerts.monitorPrices(30000);

// Check filtering
debugAlerts.checkFiltering();

// Clear all alerts
debugAlerts.clearAll();
```

---

**గమనిక:** ఈ debug tools development mode లో మాత్రమే available. Production build లో `window.debugAlerts` undefined అవుతుంది.
