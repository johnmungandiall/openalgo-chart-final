# Webhook Indicator Alert - బగ్ ఫిక్స్ సారాంశం

## సమస్య

UT Bot అలర్ట్ ట్రిగ్గర్ అయినప్పుడు webhook POST రిక్వెస్ట్ పంపబడటం లేదు. కోడ్‌లో **5 బగ్‌లు** గుర్తించబడ్డాయి - 2 ఫైల్‌లలో మొత్తం ఫిక్స్‌లు చేయబడ్డాయి.

---

## మార్చిన ఫైల్‌లు

| ఫైల్ | బగ్‌లు | ప్రాధాన్యత |
|-------|--------|-----------|
| `src/App.tsx` | #1, #4 | క్రిటికల్ |
| `src/services/globalAlertMonitor.ts` | #2, #3, #5 | క్రిటికల్ |

---

## బగ్ #1 (క్రిటికల్): అన్ని ఇండికేటర్ అలర్ట్‌లు ఒకేసారి "Triggered" గా మార్చబడుతున్నాయి

**ఫైల్:** `src/App.tsx` లైన్ 296

**సమస్య:** ఇండికేటర్ అలర్ట్ మొదటిసారి ట్రిగ్గర్ అయినప్పుడు, frequency ఏదైనా సరే (once_per_bar, every_time, only_once) status "Triggered" గా సెట్ చేయబడుతోంది. దీని వల్ల globalAlertMonitor తదుపరి చెక్‌లలో ఈ అలర్ట్‌ను skip చేస్తుంది — webhook మళ్ళీ ఎప్పటికీ పంపబడదు.

**పరిష్కారం:** `only_once` frequency ఉన్న అలర్ట్‌లకు మాత్రమే status "Triggered" గా మార్చబడుతుంది. `once_per_bar` మరియు `every_time` అలర్ట్‌లు యాక్టివ్‌గా ఉంటాయి, మానిటరింగ్ కొనసాగుతుంది.

```javascript
// మునుపటి (తప్పు): అన్ని frequencies కి status మారుస్తోంది
if (evt.alertType === 'indicator' && evt.alertId) {

// ఇప్పుడు (సరి): only_once కి మాత్రమే
if (evt.alertType === 'indicator' && evt.alertId && evt.frequency === 'only_once') {
```

---

## బగ్ #2 (క్రిటికల్): ట్రిగ్గర్ ఈవెంట్‌లో `currentPrice` లేదు

**ఫైల్:** `src/services/globalAlertMonitor.ts` లైన్ 411-422

**సమస్య:** ఇండికేటర్ అలర్ట్ ట్రిగ్గర్ అయినప్పుడు తయారయ్యే ఈవెంట్ ఆబ్జెక్ట్‌లో `currentPrice` ఫీల్డ్ లేదు. దీని వల్ల webhook payload లో price ఎల్లప్పుడూ `0` గా పంపబడుతోంది. కొన్ని webhook receivers తప్పు price వల్ల రిక్వెస్ట్‌ను తిరస్కరించవచ్చు.

**పరిష్కారం:** ట్రిగ్గర్ ఈవెంట్‌లో `currentPrice` జోడించబడింది.

```javascript
// జోడించబడినవి:
currentPrice: currentPrice ?? undefined,
frequency: alert.frequency,
```

---

## బగ్ #3 (మీడియం): `_fetchAndCacheOHLCData` లో రీకర్సివ్ కాల్

**ఫైల్:** `src/services/globalAlertMonitor.ts` లైన్ 691-710

**సమస్య:** OHLC డేటా ఫెచ్ చేసినప్పుడు, `_fetchAndCacheOHLCData` → `updateOHLCData` → `_onPriceUpdate` అనే chain ద్వారా అదే ఫంక్షన్ మళ్ళీ కాల్ అవుతోంది (recursive/re-entrant call). ఇది:
- డూప్లికేట్ webhook పంపడం
- `_previousIndicatorValues` స్టేట్ పాడవడం
- అనూహ్యమైన ప్రవర్తన

**పరిష్కారం:** `updateOHLCData()` కాల్ చేయకుండా, OHLC డేటాను నేరుగా cache లో సేవ్ చేయడం. ఇది re-entrant `_onPriceUpdate` కాల్‌ను నివారిస్తుంది.

```javascript
// మునుపటి (తప్పు): updateOHLCData కాల్ → _onPriceUpdate మళ్ళీ కాల్ అవుతుంది
this.updateOHLCData(symbol, exchange, interval, data);

// ఇప్పుడు (సరి): నేరుగా cache లో సేవ్
this._ohlcCache.set(cacheKey, { data, timestamp: now, lastAccessed: now });
```

---

## బగ్ #4 (మైనర్): Webhook direction ఎల్లప్పుడూ "up"

**ఫైల్:** `src/App.tsx` లైన్ 308

**సమస్య:** Webhook payload లో `direction` ఫీల్డ్ ఎల్లప్పుడూ `'up'` గా హార్డ్‌కోడ్ చేయబడింది — Sell సిగ్నల్‌కు కూడా `'up'` వస్తోంది.

```javascript
// మునుపటి (తప్పు): రెండు branches లో 'up' మాత్రమే
direction: (evt.conditionType === 'equals' ? 'up' : 'up')

// ఇప్పుడు (సరి): Sell condition కి 'down' వస్తుంది
direction: (evt.condition?.includes('Sell') ? 'down' : 'up')
```

---

## బగ్ #5 (మైనర్): ట్రిగ్గర్ ఈవెంట్‌లో `frequency` ఫీల్డ్ లేదు

**ఫైల్:** `src/services/globalAlertMonitor.ts` లైన్ 59, 423

**సమస్య:** `AlertTriggerEvent` ఇంటర్‌ఫేస్ మరియు ట్రిగ్గర్ ఈవెంట్ ఆబ్జెక్ట్‌లో `frequency` ఫీల్డ్ లేదు. బగ్ #1 పరిష్కారానికి ఈ ఫీల్డ్ అవసరం.

**పరిష్కారం:** `AlertTriggerEvent` ఇంటర్‌ఫేస్‌లో `frequency` జోడించబడింది, ట్రిగ్గర్ ఈవెంట్‌లో అలర్ట్ frequency పాస్ చేయబడుతోంది.

---

## డేటా ఫ్లో

```
IndicatorAlertDialog.tsx
  │── వినియోగదారు అలర్ట్ సృష్టిస్తారు (webhookUrl తో)
  │
useIndicatorAlertHandlers.ts
  │── localStorage లో సేవ్ (STORAGE_KEYS.ALERTS)
  │── globalAlertMonitor.refresh()
  │
globalAlertMonitor.ts
  │── localStorage నుండి అలర్ట్‌లు లోడ్
  │── ప్రైస్ అప్‌డేట్‌పై ఇండికేటర్ కండిషన్ చెక్
  │── ట్రిగ్గర్ ఈవెంట్ (webhookUrl, currentPrice, frequency తో)  ← బగ్ #2, #5 ఫిక్స్
  │── _onTrigger() callback
  │
App.tsx (handleBackgroundAlertTrigger)
  │── Toast నోటిఫికేషన్
  │── only_once అయితే మాత్రమే 'Triggered' స్టేటస్  ← బగ్ #1 ఫిక్స్
  │── webhookUrl ఉంటే → sendWebhook() (సరైన direction తో)  ← బగ్ #4 ఫిక్స్
  │
webhookService.ts
  │── fetch POST → webhook endpoint కి పంపడం
```

---

## టెస్టింగ్ చెక్‌లిస్ట్

- [ ] UT Bot అలర్ట్ + webhook URL → సిగ్నల్‌పై webhook అందిందా?
- [ ] Webhook payload లో సరైన price ఉందా? (0 కాదు)
- [ ] Sell సిగ్నల్‌కి direction "down" వస్తోందా?
- [ ] `once_per_bar` అలర్ట్ మొదటి ట్రిగ్గర్ తర్వాత మానిటరింగ్ కొనసాగుతోందా?
- [ ] `every_time` అలర్ట్ పదే పదే ట్రిగ్గర్ అవుతోందా?
- [ ] `only_once` అలర్ట్ ఒకసారి ట్రిగ్గర్ అయ్యాక ఆగిపోతోందా?
- [ ] డూప్లికేట్ webhook పంపడం లేదా? (recursive call fix)
- [ ] RSI, MACD వంటి ఇతర ఇండికేటర్ అలర్ట్‌లకు కూడా webhook పనిచేస్తోందా?

---

## బిల్డ్ స్థితి

TypeScript కంపైలేషన్ విజయవంతం — ఎటువంటి ఎర్రర్లు లేవు.
