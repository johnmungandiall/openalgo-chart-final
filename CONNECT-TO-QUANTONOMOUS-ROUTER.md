# Connect this chart to the Quantonomous Router (no connect prompt)

This chart normally talks **straight to OpenAlgo** (REST `:5001`, WebSocket
`:8765`). But OpenAlgo only allows **one** WebSocket connection at a time, and
the Quantonomous Engine already holds it — so this app cannot connect to
OpenAlgo's socket while the Engine is running.

The Engine ships a **router gateway** that solves this. It re-broadcasts the
single Engine-held feed and proxies REST, so any number of apps can stream live
data at the same time:

| What        | Old (OpenAlgo direct) | New (Quantonomous Router) |
| ----------- | --------------------- | ------------------------- |
| REST / API  | `http://127.0.0.1:5001` | `http://127.0.0.1:1100` |
| WebSocket   | `127.0.0.1:8765`        | `ws://127.0.0.1:1200`   |
| API key     | real OpenAlgo key       | see "About the API key" below |

The router speaks the **exact same OpenAlgo wire contract** this app already
uses (see `OPENALGO-API-CONTRACT.md`), so no protocol changes are needed — only
the three connection values change.

> Prerequisite: the Quantonomous Engine must be **running** (it starts the
> router on ports 1100 + 1200 automatically). You can confirm the gateway is
> alive by opening `http://127.0.0.1:1100/__playground` in a browser.

---

## How the chart picks its connection (so you know what to change)

All three values live in **`localStorage`** and are read in
`src/services/api/config.ts`:

| Value     | localStorage key | Default in code         |
| --------- | ---------------- | ----------------------- |
| Host URL  | `oa_host_url`    | `http://127.0.0.1:5001` |
| WS URL    | `oa_ws_url`      | `127.0.0.1:8765`        |
| API key   | `oa_apikey`      | `` (empty)              |

Two behaviours matter:

1. **The connect/API-key dialog** appears only when `oa_apikey` is **empty**
   (`checkAuth()` in `config.ts` → `UserContext.tsx`). Set a non-empty
   `oa_apikey` and the dialog never shows.
2. **Direct vs proxy.** When the host is the default `:5001`, the app routes
   through the Vite dev proxy (`/api`, `/ws`). When the host is anything else
   (like `:1100`) **and** the WS URL starts with `ws://`, the app connects
   **directly**. The router allows this — its REST port sends permissive CORS
   headers, and WebSockets aren't CORS-restricted.

---

## Recommended: pre-seed the three values in `src/main.tsx`

This is the cleanest "no questions asked" setup. It works in both `npm run dev`
and a production build, needs **one** edit, and forces a direct connection to
the router.

Open **`src/main.tsx`** and add this block right after the theme line
(near line 16, before React renders):

```ts
// --- Quantonomous Router connection (force, no connect prompt) ---
// The Engine hosts an OpenAlgo-compatible gateway: REST on 1100, WS on 1200.
// Seeding these before React mounts means the API-key dialog never appears.
localStorage.setItem('oa_host_url', 'http://127.0.0.1:1100');
localStorage.setItem('oa_ws_url', 'ws://127.0.0.1:1200');
localStorage.setItem('oa_apikey', 'YOUR_OPENALGO_API_KEY'); // real key — see note below
// -----------------------------------------------------------------
```

After this:

- `getApiBase()` returns `http://127.0.0.1:1100/api/v1` (direct, no proxy).
- `getWebSocketUrl()` returns `ws://127.0.0.1:1200` (direct).
- `checkAuth()` sees a non-empty key → the chart loads straight to the
  workspace, no dialog.

> Note: `setItem` **overwrites** on every page load, so it always wins even if a
> stale value was saved earlier. If you'd rather let the user override it from
> the Settings dialog later, guard each line with
> `if (!localStorage.getItem('oa_host_url')) { ... }`.

---

## About the API key (the one thing that genuinely needs a real key)

- **WebSocket (`:1200`) does NOT need a real key.** The router authenticates
  upstream with the Engine's own stored key, so it accepts any key the client
  sends and always replies auth-success. Live ticks work with a placeholder.
- **REST (`:1100`) DOES need a real OpenAlgo key.** It's a transparent
  pass-through to your broker, so it forwards whatever `apikey` the chart sends.
  Endpoints like `/history`, `/chart`, `/quotes`, `/optionchain`, `/funds`
  will return broker `403` without a valid key — and the chart needs `/history`
  to draw candles.

So: put your **real OpenAlgo API key** in `oa_apikey` for a fully working chart.
Get it from the OpenAlgo dashboard at `http://127.0.0.1:5001/apikey` (the
OpenAlgo web UI, not the router).

> **Security:** the key in `main.tsx` is your broker key. Do **not** commit it
> to git. Keep `YOUR_OPENALGO_API_KEY` as a placeholder in committed code and
> fill the real value only in your local copy, or load it from an env var /
> untracked file. If you only need live streaming (no candles/history), a dummy
> key is fine for the WS feed.

---

## Alternatives

### A) Change the defaults in `src/services/api/config.ts`

Edit lines 9–10:

```ts
const DEFAULT_HOST = 'http://127.0.0.1:1100';
const DEFAULT_WS_HOST = 'ws://127.0.0.1:1200';
```

Caveat: changing `DEFAULT_WS_HOST` alone still routes WS through the Vite
`/ws` proxy, because `getWebSocketUrl()` treats the default value as "use the
proxy". To get a **direct** WS connection you must either also retarget the Vite
proxy (Alternative B) or set `oa_ws_url` in localStorage to a non-default
`ws://...` value (the Recommended method already does this). You still need a
real key in `oa_apikey` for REST. The Recommended method avoids this gotcha, so
prefer it.

### B) Retarget the Vite dev proxy (dev / `vite preview` only)

Leave `config.ts` defaults as-is and point the proxy at the router in
**`vite.config.ts`**:

```ts
const proxy = {
  '/api': { target: 'http://127.0.0.1:1100', changeOrigin: true },
  '/ws':  { target: 'ws://127.0.0.1:1200', ws: true },
  // ...leave /npl-time unchanged
};
```

Pros: no secret in source, no CORS (same-origin via proxy). Cons: only works
when the app is served by Vite (dev server or `vite preview`), **not** a bare
static build. You still need a real key in `oa_apikey` for REST.

### C) Manual, one-time per browser (no code change)

Open the chart → **Settings → OpenAlgo Connection** and set:

- Host URL: `http://127.0.0.1:1100`
- WebSocket URL: `ws://127.0.0.1:1200`
- API Key: your real OpenAlgo key

These persist in `localStorage`, so it's a one-time step per browser profile —
but it does require typing the values once, which the Recommended method avoids.

---

## Verify it worked

1. Start the Quantonomous Engine (the router auto-starts on 1100 + 1200).
2. Open `http://127.0.0.1:1100/__playground` — connect, subscribe to a symbol,
   confirm live ticks arrive. This proves the gateway itself is healthy.
3. Start this chart (`npm run dev`). It should load **without** the API-key
   dialog and show live prices + candles.
4. In the browser devtools **Network** tab: REST calls go to `127.0.0.1:1100`,
   the WebSocket connects to `127.0.0.1:1200`.

## Revert

Delete the seed block from `main.tsx` (or the `config.ts` / `vite.config.ts`
edits), then in devtools run:

```js
localStorage.removeItem('oa_host_url');
localStorage.removeItem('oa_ws_url');
localStorage.removeItem('oa_apikey');
```

Reload — the app is back to talking to OpenAlgo directly on `:5001` / `:8765`.
