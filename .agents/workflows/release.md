# Release Runbook — Windows `.exe` (Tauri)

How to ship Open Chart as an installable Windows `.exe` with the source
code hidden. Follow these steps to reproduce exactly the release we built.

The app is wrapped in a **Tauri v2** shell: the built frontend (`dist/`) gets
embedded inside a compiled Rust binary, so users get an `.exe` and never see
your TypeScript source, build config, or secrets.

---

## 0. One-time setup (per machine)

You only do this once. Skip if `cargo --version` already works.

| Tool | Why | Install |
|------|-----|---------|
| Node 18+ | builds the frontend | already installed |
| WebView2 runtime | the app renders in it | pre-installed on Win10/11 |
| VS C++ Build Tools | Rust's MSVC linker | "Desktop development with C++" workload |
| **Rust** | compiles the Tauri shell | see below |

Install Rust (non-interactive):

```powershell
$dest = "$env:TEMP\rustup-init.exe"
Invoke-WebRequest -Uri "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe" -OutFile $dest -UseBasicParsing
& $dest -y --default-toolchain stable --profile minimal
```

Then open a NEW terminal (so `%USERPROFILE%\.cargo\bin` is on PATH) and verify:

```powershell
cargo --version
```

The Tauri CLI is already a devDependency (`@tauri-apps/cli`), so `npm install`
brings it in — no global install needed.

---

## 1. Pre-release checks

```powershell
npm install            # make sure deps are present
npm run type-check     # TS check
npm run test           # unit tests must pass
npm run build          # confirm the production frontend builds clean
```

- **No AGPL/copyleft deps.** Before release, scan `package.json` — anything
  AGPL-3.0 (e.g. the old `pinets`) blocks closed-source distribution. Keep it out.
- **`.env.local` is NOT shipped.** It holds your real broker key and is
  gitignored. The production build ignores `VITE_OPENALGO_API_KEY` anyway
  (see Gotchas), so the key can never end up inside the `.exe`.

---

## 2. Bump the version

Set the release version in **two** places so they match:

- `package.json` -> `"version"`
- `src-tauri/tauri.conf.json` -> `"version"`  (this is what shows in the installer)

---

## 3. Build the installer

```powershell
npm run tauri build
```

What this does automatically:
1. Runs `npm run build` (`beforeBuildCommand`) -> produces `dist/` in
   **production** mode (so `.env.production` applies, no key baked).
2. Compiles the Rust shell and embeds `dist/`.
3. Packages an **NSIS `.exe`** installer.

First build takes ~10-15 min (compiles ~470 Rust crates). Later builds are
~1-2 min because crates are cached. Exit code `0` = success.

---

## 4. Output — where the files land

| File | Size | Use |
|------|------|-----|
| `src-tauri/target/release/bundle/nsis/Open Chart_<version>_x64-setup.exe` | ~2 MB | **Installer — give this to users** |
| `src-tauri/target/release/app.exe` | ~9 MB | Portable build — runs without installing |

> The portable binary is named `app.exe` (the Rust crate name). The *installed*
> app shows as "Open Chart". To rename the portable exe, set a
> `mainBinaryName` in `tauri.conf.json` or rename the `[package] name` in
> `src-tauri/Cargo.toml`, then rebuild.

Open the folder:

```powershell
explorer "c:\Qwantonomous\openalgo-chart-final\src-tauri\target\release\bundle\nsis"
```

---

## 5. What to tell users

- They must have the **Quantonomous Router running** on their machine
  (REST `127.0.0.1:1100`, WS `127.0.0.1:1200`). The `.exe` is only the chart
  frontend — it does not bundle the router.
- Win10/11 already has the WebView2 runtime, so nothing extra to install.
- The app is **pre-pointed at the router**; on first launch each user enters
  **their own** API key once (it persists in local storage).

---

## 6. Commit (artifacts stay out of git)

```powershell
git add .env.production package.json src/main.tsx src-tauri
git commit -F <message-file>
```

`src-tauri/target/` is gitignored — **never commit the `.exe` or build
artifacts**. Commit only source/config (`src-tauri/` scaffold, `Cargo.lock`,
config, `package.json`). Only commit when explicitly asked.

---

## Gotchas (why the config is the way it is)

- **API key only seeds in dev.** `src/main.tsx` reads `VITE_OPENALGO_API_KEY`
  only when `import.meta.env.DEV` is true. A production `.exe` therefore never
  contains a broker key, regardless of what's in `.env.local`.
- **NPL time sync disabled in prod.** `.env.production` sets
  `VITE_NPL_TIME_URL=disabled`. There's no Vite dev proxy in a packaged app, so
  the relative `/npl-time` route can't resolve; the app falls back to the local
  machine clock.
- **NSIS target only.** `tauri.conf.json` -> `bundle.targets: ["nsis"]`. This
  produces a self-contained `.exe` installer and avoids needing the WiX/MSI
  toolchain. Use `["nsis","msi"]` if you also want an MSI.
- **CORS / direct calls.** `main.tsx` forces the host to `127.0.0.1:1100`, which
  is NOT in `PROXIED_HOSTS`, so the app makes direct cross-origin calls to the
  router. This works because the router sends permissive CORS headers and the
  Tauri webview serves over `http://`, so there's no mixed-content block.
  `tauri.conf.json` keeps `security.csp: null` so those fetches aren't blocked.
- **WebSockets** aren't CORS-gated, so `ws://127.0.0.1:1200` works unchanged.

---

## Quick reference (TL;DR)

```powershell
# one-time: install Rust (see step 0), then:
npm install
npm run test
# bump version in package.json + src-tauri/tauri.conf.json
npm run tauri build
explorer "src-tauri\target\release\bundle\nsis"
```
