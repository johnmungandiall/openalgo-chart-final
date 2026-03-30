# అలర్ట్‌లు రావడం లేదు - డీబగ్ గైడ్

## సమస్య: అలర్ట్‌లు అస్సలు ట్రిగ్గర్ అవ్వడం లేదు

## డీబగ్ చేయడానికి స్టెప్స్

### 1. Browser Console లో లాగ్స్ చెక్ చేయండి

**F12** నొక్కి Developer Tools ఓపెన్ చేసి, **Console** ట్యాబ్ చూడండి.

#### చూడవలసిన లాగ్స్:

```
[GlobalAlertMonitor] Loaded X active alerts from storage
[GlobalAlertMonitor] Starting monitor for X symbols: [...]
[GlobalAlertMonitor] Price update SYMBOL PRICE - checking X alerts
[GlobalAlertMonitor] Calculating INDICATOR for SYMBOL with X bars
[GlobalAlertMonitor] Indicator alert triggered: {...}
```

### 2. లాగ్ లెవెల్ సెట్ చేయండి

Console లో ఈ కమాండ్ రన్ చేయండి:

```javascript
localStorage.setItem('oa_log_level', '0');
location.reload();
```

ఇది అన్ని DEBUG లాగ్స్ ఎనేబుల్ చేస్తుంది.

### 3. globalAlertMonitor స్టేటస్ చెక్ చేయండి

Console లో:

```javascript
// Check if monitor is running
window.globalAlertMonitor = globalAlertMonitor;
globalAlertMonitor.isRunning();  // true అయి ఉండాలి

// Check cached alerts
globalAlertMonitor._cachedAlerts;  // మీ అలర్ట్‌లు కనిపించాలి

// Check WebSocket connection
globalAlertMonitor._ws;  // null కాకూడదు
```

### 4. localStorage లో అలర్ట్‌లు ఉన్నాయా చెక్ చేయండి

Console లో:

```javascript
// Check indicator alerts
JSON.parse(localStorage.getItem('oa_alerts') || '[]');

// Check price alerts
JSON.parse(localStorage.getItem('oa_chart_alerts') || '{}');
```

### 5. అలర్ట్ సృష్టి తర్వాత refresh అవుతుందా చెక్ చేయండి

Console లో:

```javascript
// Manually refresh
globalAlertMonitor.refresh();
```

## సాధారణ సమస్యలు మరియు పరిష్కారాలు

### సమస్య 1: `globalAlertMonitor.isRunning()` = false

**కారణం:** Monitor start కాలేదు లేదా authentication లేదు

**పరిష్కారం:**
```javascript
// Check authentication
console.log('isAuthenticated:', isAuthenticated);

// Manually start
globalAlertMonitor.start((evt) => {
  console.log('Alert triggered:', evt);
});
```

### సమస్య 2: `_cachedAlerts` ఖాలీగా ఉంది

**కారణం:** localStorage లో అలర్ట్‌లు లేవు లేదా అవి filtered out అయ్యాయి

**చెక్ చేయండి:**
- Alert status 'Triggered' లేదా 'Paused' కాదా?
- Alert type 'indicator' గా సెట్ చేయబడిందా?
- Alert created_at చాలా పాతదా (24 hours కంటే ఎక్కువ)?

**పరిష్కారం:**
```javascript
// Check raw alerts
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
console.log('Raw alerts:', alerts);

// Check filtered alerts
alerts.filter(a =>
  a.status !== 'Triggered' &&
  a.status !== 'Paused' &&
  a.type === 'indicator'
);
```

### సమస్య 3: WebSocket connection లేదు (`_ws` = null)

**కారణం:** ఏ symbols కోసం monitor చేయాల్సిన అవసరం లేదు

**పరిష్కారం:**
- అలర్ట్‌లో symbol మరియు exchange సరిగ్గా సెట్ చేయబడిందా చెక్ చేయండి
- అలర్ట్ సృష్టించిన తర్వాత `globalAlertMonitor.refresh()` కాల్ అవుతుందా చూడండి

### సమస్య 4: Price updates రావడం లేదు

**కారణం:** WebSocket నుండి డేటా రావడం లేదు

**చెక్ చేయండి:**
```javascript
// Add temporary listener
globalAlertMonitor._onPriceUpdate = new Proxy(globalAlertMonitor._onPriceUpdate, {
  apply(target, thisArg, args) {
    console.log('Price update received:', args[0]);
    return target.apply(thisArg, args);
  }
});
```

### సమస్య 5: OHLC డేటా లేదు

**కారణం:** Indicator alerts కోసం historical data అవసరం

**పరిష్కారం:**
```javascript
// Check OHLC cache
console.log('OHLC Cache:', globalAlertMonitor._ohlcCache);

// Manually update OHLC data (chart should do this automatically)
globalAlertMonitor.updateOHLCData('NIFTY', 'NSE', '1m', ohlcData);
```

### సమస్య 6: Indicator calculation విఫలమవుతోంది

**కారణం:** Indicator data manager లేదా evaluator లో error

**చెక్ చేయండి:**
```javascript
// Check for errors in console
// Look for: [GlobalAlertMonitor] Error checking indicator alert
```

## టెస్ట్ అలర్ట్ సృష్టించడం

Console లో ఈ కోడ్ రన్ చేసి టెస్ట్ అలర్ట్ సృష్టించండి:

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
  frequency: 'every_time',
  message: 'Test UT Bot Alert',
  webhookUrl: 'https://webhook.site/your-unique-url',
  status: 'Active',
  created_at: Date.now()
};

// Save to localStorage
const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
alerts.push(testAlert);
localStorage.setItem('oa_alerts', JSON.stringify(alerts));

// Refresh monitor
globalAlertMonitor.refresh();

console.log('Test alert created. Check if it appears in _cachedAlerts');
console.log(globalAlertMonitor._cachedAlerts);
```

## మాన్యువల్‌గా అలర్ట్ ట్రిగ్గర్ చేయడం (టెస్టింగ్ కోసం)

```javascript
// Manually trigger an alert to test webhook
const testEvent = {
  alertId: 'test-123',
  symbol: 'NIFTY',
  exchange: 'NSE',
  alertType: 'indicator',
  indicator: 'UT Bot',
  condition: 'Buy Signal',
  conditionType: 'equals',
  timestamp: Date.now(),
  message: 'Manual test alert',
  webhookUrl: 'https://webhook.site/your-unique-url',
  currentPrice: 22450.75,
  frequency: 'every_time'
};

// Call the trigger handler directly
handleBackgroundAlertTrigger(testEvent);
```

## ముఖ్యమైన నోట్స్

1. **Authentication అవసరం**: `isAuthenticated = true` అయి ఉండాలి, లేకపోతే monitor start కాదు

2. **Chart ఓపెన్ అయి ఉండాలి**: Indicator alerts కోసం OHLC డేటా chart నుండి వస్తుంది

3. **Correct Interval**: Alert interval మరియు chart interval match అవ్వాలి (లేదా chart ఆ interval కోసం డేటా పంపాలి)

4. **Webhook URL**: Valid URL అయి ఉండాలి (https:// తో start అవ్వాలి)

5. **Frequency**:
   - `every_time` - టెస్టింగ్ కోసం ఉపయోగించండి (ప్రతి టిక్‌కు ట్రిగ్గర్ అవుతుంది)
   - `once_per_bar` - ప్రతి కొత్త కాండిల్‌కు ఒకసారి
   - `only_once` - జీవితకాలంలో ఒకసారి మాత్రమే

## సహాయం కావాలంటే

Console లో ఈ డయాగ్నోస్టిక్ ఇన్ఫర్మేషన్ కాపీ చేసి పంపండి:

```javascript
console.log('=== ALERT MONITOR DIAGNOSTICS ===');
console.log('Is Running:', globalAlertMonitor.isRunning());
console.log('Cached Alerts:', globalAlertMonitor._cachedAlerts);
console.log('WebSocket:', globalAlertMonitor._ws ? 'Connected' : 'Not connected');
console.log('OHLC Cache size:', globalAlertMonitor._ohlcCache.size);
console.log('Last Prices:', globalAlertMonitor._lastPrices);
console.log('Raw localStorage alerts:', JSON.parse(localStorage.getItem('oa_alerts') || '[]'));
console.log('Log Level:', localStorage.getItem('oa_log_level'));
console.log('=================================');
```
