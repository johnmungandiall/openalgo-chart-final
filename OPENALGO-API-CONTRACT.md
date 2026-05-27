# OpenAlgo API Contract — What This Chart Consumes

This document describes **exactly** which OpenAlgo backend endpoints and message
formats the chart app calls, what it sends, and what shape of response it expects
back. Use it to build an alternative data source (a mock server, a different
broker adapter, a replay engine) that the chart can talk to **without any code
changes** — just point the Host URL at your server.

> If your server speaks the contracts below, the chart will render candles,
> stream live ticks, search symbols, show depth, and place orders exactly as it
> does against a real OpenAlgo backend.

---

## 1. Connection model

| Thing | Value |
|-------|-------|
| REST base (default) | `http://127.0.0.1:5001/api/v1` |
| WebSocket (default) | `ws://127.0.0.1:8765` |
| API version prefix | `/api/v1` |
| Auth | API key sent **in the JSON body** (`apikey`) for POST, or **query string** (`?apikey=`) for GET. No bearer header. |
| CORS | The chart prefers to route localhost traffic through the Vite proxy so requests stay **same-origin** (see `vite.config.ts` / `src/services/api/config.ts`). If you serve cross-origin, your server must send `Access-Control-Allow-Origin` for the page's origin. |
| Content type | `application/json` |
| Credentials | `fetch(..., { credentials: 'include' })` — cookies are sent if you set them. |

**Where this is configured in code:** `src/services/api/config.ts`
(`getApiBase()`, `getWebSocketUrl()`, `getApiKey()`).

### Standard response envelope

Most endpoints return:

```json
{ "status": "success", "data": <payload> }
```

On error: `{ "status": "error", "message": "..." }`.
The client (`src/services/api/client.ts`) treats `status === 'success'` as the
happy path and unwraps `.data`. Several endpoints are read with `rawResponse`
and tolerate **multiple nesting shapes** (e.g. `data.orders`, `orderbook`, or a
bare array) — those are noted per-endpoint.

### HTTP status handling

- `200` → parsed normally.
- `401` → the chart redirects the browser to `${hostUrl}/auth/login`.
- `400 / 403` → treated as invalid key / unsupported symbol (no redirect).
- network failure → "Could not connect to OpenAlgo server".

---

## 2. The minimum you need to render a chart

If you only implement these three things, the chart draws and updates:

1. **`GET /api/v1/chart`** — connection/key validation (returns prefs).
2. **`POST /api/v1/history`** — historical OHLCV candles.
3. **WebSocket** `authenticate` → `subscribe` → `market_data` — live ticks.

Everything else (search, depth, intervals, options, trading) enhances the app
but is not required to see a live candlestick chart.

---

## 3. REST endpoints

### 3.1 `GET /api/v1/chart` — validate key + load preferences
Used by the connect dialog (`src/components/ApiKeyDialog/ApiKeyDialog.tsx`).

**Request:** `GET /api/v1/chart?apikey=<KEY>`

**Response (200):** any JSON object of user preferences. The chart stores each
key/value into local settings. A bare `{ "data": {} }` or `{}` is enough to
pass validation.

```json
{ "data": { "theme": "dark", "defaultExchange": "NSE" } }
```

Returning `400/401/403` here makes the dialog show "Invalid API key".

---

### 3.2 `POST /api/v1/history` — historical candles  ⭐ core feed
`src/services/chartDataService.ts` → `getKlines()` / `getHistoricalKlines()`.

**Request body:**
```json
{
  "apikey": "<KEY>",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "interval": "D",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

- `interval` is **already converted** before sending: `1d→D`, `1w→W`, `1M→M`;
  all other values (`1m`, `5m`, `15m`, `1h`, …) are passed through as typed.
  See `convertInterval()` in `config.ts`.
- `start_date` / `end_date` are `YYYY-MM-DD`. The client picks the range based on
  interval (e.g. ~5 days for 1m, 2 years for daily, 10 years for weekly/monthly).

**Response body:**
```json
{
  "status": "success",
  "data": [
    { "timestamp": 1704067200, "open": 100.5, "high": 101.2, "low": 99.8, "close": 100.9, "volume": 12345 },
    { "timestamp": 1704153600, "open": 100.9, "high": 102.0, "low": 100.1, "close": 101.7, "volume": 23456 }
  ]
}
```

**Critical parsing rules (`chartDataService.ts`):**
- Each row's time comes from **`timestamp` (epoch SECONDS)** *or* a `date` /
  `datetime` string. If `timestamp` is a number it is used directly.
- ⚠️ The client **adds 19800 seconds (IST, +5:30)** to every timestamp before
  handing it to the chart. So return **plain epoch seconds (broker/UTC基准 as
  OpenAlgo does)** — do **not** pre-add the IST offset, or candles shift +5:30.
- `open/high/low/close` parsed as floats; `volume` defaults to 0 if missing.
- Rows are sorted ascending by time and de-duplicated. Out-of-order or duplicate
  timestamps are fine — the client cleans them.
- Invalid rows (non-finite OHLC, `time <= 0`) are dropped.

---

### 3.3 `POST /api/v1/quotes` — snapshot quote
`chartDataService.ts` → `getTickerPrice()`.

**Request:** `{ "apikey", "symbol", "exchange" }`

**Response:**
```json
{
  "status": "success",
  "data": {
    "ltp": 101.7,
    "prev_close": 100.0,
    "open": 100.2,
    "high": 102.0,
    "low": 99.9,
    "volume": 456789
  }
}
```
- Accepted aliases: `ltp` **or** `last_price`; `prev_close` **or**
  `previous_close`. If `prev_close` is missing/0, the client falls back to
  `open`. Change % is computed client-side. `prev_close` is cached for use by
  the WebSocket feed (which doesn't send it).

---

### 3.4 `POST /api/v1/depth` — market depth (DOM)
`chartDataService.ts` → `getDepth()`.

**Request:** `{ "apikey", "symbol", "exchange" }`

**Response:**
```json
{
  "status": "success",
  "data": {
    "asks": [ { "price": 101.8, "quantity": 50 }, { "price": 101.9, "quantity": 75 } ],
    "bids": [ { "price": 101.7, "quantity": 60 }, { "price": 101.6, "quantity": 40 } ],
    "ltp": 101.7, "ltq": 10,
    "high": 102.0, "low": 99.9, "open": 100.2,
    "prev_close": 100.0, "volume": 456789, "oi": 12000,
    "totalbuyqty": 100000, "totalsellqty": 95000
  }
}
```
Typically 5 levels each side. Field names are exact (note `prev_close`,
`totalbuyqty`, `totalsellqty`, all lowercase).

---

### 3.5 `POST /api/v1/search` — symbol search
`src/services/instrumentService.ts` → `searchSymbols()`.

**Request:** `{ "apikey", "query", "exchange"?, "instrumenttype"? }`
- `exchange` filter: `NSE, BSE, NFO, MCX, BFO, NSE_INDEX, BSE_INDEX`.
- `instrumenttype` filter: `EQ, FUT, CE, PE, OPTIDX, …`.

**Response:** `{ "data": [ { "symbol", "name", "exchange", "instrumenttype" } ] }`
(a bare array is also accepted).

---

### 3.6 `GET /api/v1/instruments` — instrument master (cached 5 min)
`instrumentService.ts` → `getInstruments()` (also backs `getLotSize`,
`getInstrumentInfo`).

**Request:** `GET /api/v1/instruments?apikey=<KEY>&exchange=NSE`

**Response:**
```json
{
  "data": [
    { "symbol": "RELIANCE", "brsymbol": "RELIANCE-EQ", "tradingsymbol": "RELIANCE",
      "name": "Reliance Industries", "exchange": "NSE", "lotsize": 1,
      "expiry": "", "strike": 0, "instrumenttype": "EQ" }
  ]
}
```

---

### 3.7 `POST /api/v1/intervals` — supported intervals
`instrumentService.ts` → `getIntervals()`.

**Request:** `{ "apikey" }`

**Response:**
```json
{
  "status": "success",
  "data": {
    "seconds": ["1s","5s"],
    "minutes": ["1m","3m","5m","15m"],
    "hours": ["1h"],
    "days": ["D"],
    "weeks": ["W"],
    "months": ["M"]
  }
}
```
Must have `status: "success"` and a `data` object or it's ignored.

---

### 3.8 Options endpoints
`src/services/optionsApiService.ts`.

| Function | Method + Path | Request body | Response highlights |
|----------|---------------|--------------|---------------------|
| `getExpiry` / `fetchExpiryDates` | `POST /api/v1/expiry` | `{apikey, symbol, exchange, instrumenttype}` (`'futures'`\|`'options'`) | `{status, data: ["30-DEC-25", …]}` |
| `getOptionChain` | `POST /api/v1/optionchain` | `{apikey, underlying, exchange, strike_count, expiry_date?}` | `{status, underlying, underlying_ltp, underlying_prev_close, expiry_date, atm_strike, chain:[{strike, ce:{symbol,ltp,oi,volume,iv}, pe:{…}}]}` |
| `getOptionGreeks` | `POST /api/v1/optiongreeks` | `{apikey, symbol, exchange, …opts}` | `{status, symbol, underlying, strike, option_type, expiry_date, days_to_expiry, spot_price, option_price, implied_volatility, greeks:{}}` |
| `getMultiOptionGreeks` | `POST /api/v1/multioptiongreeks` | `{apikey, symbols:[{symbol,exchange}], …opts}` (≤50/batch) | `{status, data:[…greeks], summary:{total,success,failed}}` |

`400` on optionchain → treated as "symbol doesn't support F&O".

---

### 3.9 Account endpoints
`src/services/trading/account.service.ts` via `makeApiRequest` (POST,
`apikey` injected automatically).

| Function | Path | Notes |
|----------|------|-------|
| `ping` | `/api/v1/ping` | connectivity/key check (raw response) |
| `getFunds` | `/api/v1/funds` | returns `data` object |
| `getPositionBook` | `/api/v1/positionbook` | array under `data`/`positionbook`/`positions` or bare array |
| `getOrderBook` | `/api/v1/orderbook` | `{orders, statistics}` or nested/bare variants |
| `getTradeBook` | `/api/v1/tradebook` | array under `data`/`tradebook`/`trades` or bare |
| `getHoldings` | `/api/v1/holdings` | `{holdings, statistics}` or nested/bare variants |

The client is lenient about nesting — see `account.service.ts` for the exact
fallbacks it accepts.

---

### 3.10 Order endpoints
`src/services/orderService.ts`.

| Function | Path | Request body |
|----------|------|--------------|
| `placeOrder` | `POST /api/v1/placeorder` | `{apikey, strategy, exchange, symbol, action(BUY\|SELL), quantity(int), product(MIS\|CNC\|NRML), pricetype(MARKET\|LIMIT\|SL\|SL-M), price, trigger_price, disclosed_quantity}` |
| `modifyOrder` | `POST /api/v1/modifyorder` | `{apikey, orderid, …fields}` |
| `cancelOrder` | `POST /api/v1/cancelorder` | `{apikey, orderid, strategy}` |

Also registered in `src/services/api/endpoints.ts` (not all wired yet):
`/cancelallorder`, `/closeposition`.

**Response:** `{ "status": "success", "orderid": "240101000001234", "message": "..." }`
or `{ "status": "error", "message": "..." }`.

---

## 4. WebSocket protocol  ⭐ core feed
`src/services/openalgo.ts` (`SharedWebSocketManager`). **One** socket is shared
for the whole app (OpenAlgo allows one WS per API key). URL: `ws://<host>:8765`
(or proxied `/ws`).

All messages are JSON text frames.

### Handshake
1. On open, the **client sends**:
   ```json
   { "action": "authenticate", "api_key": "<KEY>" }
   ```
2. The **server must reply** with any of these (all accepted as success):
   ```json
   { "type": "auth", "status": "success" }
   { "type": "authenticated" }
   { "status": "authenticated" }
   ```
   Only after this does the client send subscriptions.

### Subscribe / unsubscribe
Client → server:
```json
{ "action": "subscribe",   "symbol": "RELIANCE", "exchange": "NSE", "mode": 2 }
{ "action": "unsubscribe", "symbol": "RELIANCE", "exchange": "NSE" }
```
`mode: 2` = quote mode (default). `exchange` defaults to `NSE` if omitted.

### Market data (server → client)  ⭐ this is what moves the chart
```json
{
  "type": "market_data",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "data": {
    "ltp": 101.75,
    "open": 100.2,
    "high": 102.0,
    "low": 99.9,
    "volume": 456789,
    "timestamp": 1704067200000,
    "bid": 101.7,
    "ask": 101.8
  }
}
```
Parsing rules (`subscribeToTicker` / `subscribeToMultiTicker`):
- Price taken from `data.ltp` **or** `data.last_price`. Must be `> 0` or the
  tick is ignored.
- ⚠️ `data.timestamp` is **epoch MILLISECONDS** — the client does
  `timestamp / 1000` then **adds the 19800s IST offset**. If you omit it, the
  client uses `Date.now()`.
- `open/high/low` fall back to `ltp` if missing; `volume` defaults to 0.
- `type` **must be** `"market_data"` and `symbol` must match a subscription.

### Heartbeat
Server may send `{ "type": "ping" }`; the client auto-replies
`{ "type": "pong" }`. Keep-alive is handled for you.

### Errors / reconnect
- `{ "type": "error", "message": "..." }` (or `type:"auth"` without success) is
  logged as an auth error.
- On socket close the client auto-reconnects with exponential backoff
  (2s → max 30s) and re-subscribes everything on the next successful auth.

---

## 5. Time / timezone summary (read this twice)

The chart is built for **IST (Indian markets)** and applies a fixed
**+19800 second (5:30)** offset to *every* timestamp it receives, both from
`/history` and from WebSocket `market_data`.

- **REST `/history`** → send `timestamp` in **epoch seconds** (UTC/broker base).
- **WS `market_data`** → send `timestamp` in **epoch milliseconds**.
- Do **not** pre-shift to IST yourself — the client does it. Double-shifting
  pushes candles 5:30 into the future.

---

## 6. Build-a-mock checklist

To feed this chart from a custom source:

- [ ] Serve REST under `/api/v1` and a WS endpoint. Either reuse port `5001`/
      `8765`, or set your Host URL in the connect dialog and ensure CORS allows
      the page origin (or run behind the Vite proxy — see `vite.config.ts`,
      overridable via `OPENALGO_API_TARGET`).
- [ ] `GET /chart?apikey=` → `200 { "data": {} }`.
- [ ] `POST /history` → `{ status:"success", data:[ {timestamp(sec),o,h,l,c,volume} ] }`.
- [ ] WS: accept `{action:"authenticate"}` → reply `{type:"auth",status:"success"}`.
- [ ] WS: accept `{action:"subscribe", symbol, exchange}` → stream
      `{type:"market_data", symbol, exchange, data:{ltp, timestamp(ms), …}}`.
- [ ] (optional) `POST /quotes`, `POST /depth`, `POST /search`,
      `GET /instruments`, `POST /intervals`.
- [ ] (optional, for trading) account + order endpoints in §3.9 / §3.10.

---

## 7. Source-of-truth files

| Concern | File |
|---------|------|
| Base URLs, proxy decision, key, interval mapping | `src/services/api/config.ts` |
| Candles, quotes, depth | `src/services/chartDataService.ts` |
| Search, instruments, lot size, intervals | `src/services/instrumentService.ts` |
| Option chain / greeks / expiry | `src/services/optionsApiService.ts` |
| Account (funds/positions/orders/trades/holdings) | `src/services/trading/account.service.ts` |
| Place/modify/cancel order | `src/services/orderService.ts` |
| Endpoint path registry | `src/services/api/endpoints.ts` |
| Generic request envelope handling | `src/services/api/client.ts` |
| WebSocket manager + tick parsing | `src/services/openalgo.ts` |
| Connect dialog / key validation | `src/components/ApiKeyDialog/ApiKeyDialog.tsx` |

> Endpoint paths in this doc reflect what the **code actually calls**. The
> `endpoints.ts` registry also lists a few not-yet-wired paths (e.g.
> `/expirydates`, `/optionsymbols`, `/lotsize`, `/master`, `/intervalhistory`);
> the live calls use `/expiry`, `/optionchain`, `/instruments`, and `/history`
> as documented above.
