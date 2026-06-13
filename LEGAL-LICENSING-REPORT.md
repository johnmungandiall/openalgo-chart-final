# Open Chart — Licensing & Legal Report (Commercial Sale)

**Product:** Open Chart (`open-chart`) — professional trading/charting desktop application
**Version:** 1.0.5
**Distribution model:** Paid **desktop application** (Tauri 2 → Windows NSIS/Inno installer). Not SaaS. Runs on the customer's machine, connects to a locally-run OpenAlgo backend.
**Report date:** 2026-06-05
**Prepared by:** Engineering (license/dependency audit)

> ⚠️ **Disclaimer:** This is a **technical license/dependency analysis, not formal legal advice.** It is intended to inform a go/no-go decision and to surface risks. Because this is a paid commercial product and at least one upstream dependency has an ambiguous license (see §4), a one-time review by a qualified IP/software lawyer is recommended before large-scale commercial distribution.

---

## 1. Executive Summary / Verdict

| Question | Answer |
|---|---|
| Can this be sold as a closed-source, paid **desktop app**? | ✅ **Yes** |
| Are we forced to open-source our code? | ❌ **No** — all distributed dependencies are permissive (MIT / ISC / Apache-2.0 / MPL-or-Apache) |
| Any GPL / AGPL / copyleft blockers in the shipped product? | ❌ **None found** |
| Can we offer **alerts + webhooks** for free (TradingView charges for alerts)? | ✅ **Yes — fully legal** (our own code; the library license does not restrict features) |
| Outstanding risks before sale | ⚠️ Base repo licensing is informal (README-only "MIT"); attribution/notice gaps to close — see §4, §9 |

**Bottom line:** The product is **sellable** as a proprietary paid desktop application. There are **no licenses that force source disclosure**. Two housekeeping items (upstream license confirmation + attribution/NOTICE) should be closed to be fully clean.

---

## 2. What we actually distribute

For a license audit, only what is **shipped to the customer** matters:

1. **Compiled frontend bundle** — built from our React/TypeScript source + npm **production** dependencies.
2. **Rust binary** (`app.exe`) — Tauri shell + Rust crate dependencies.
3. **Installer** (`Open-Chart-1.0.5-Setup.exe`) + bundled assets/icons.
4. **Runtime dependency (not bundled):** Microsoft Edge **WebView2** runtime (ships with Windows 10/11).
5. **External backend (not bundled):** OpenAlgo (customer installs separately).

`devDependencies` (test/build tooling) are **not** distributed and therefore do not affect resale rights.

---

## 3. Dependency license audit

### 3.1 npm production dependencies

Scanned with `license-checker --production`:

| License | Count | Resale impact |
|---|---:|---|
| MIT | 28 | ✅ Permissive — commercial/closed-source use allowed |
| ISC | 1 | ✅ Permissive (functionally equivalent to MIT) |
| Apache-2.0 | 1 | ✅ Permissive — **+ attribution/NOTICE condition** (see §5) |
| MPL-2.0 OR Apache-2.0 | 1 | ✅ Choose Apache-2.0 → fully permissive |
| UNLICENSED | 1 | ✅ This is **our own app** (`open-chart`, `private: true`) — proprietary, as intended |

**Copyleft scan (GPL / AGPL / LGPL / SSPL / EUPL / CDDL / CC):** **NONE found** in the production tree. ✅

Packages worth naming:

- **`lightweight-charts@5.2.0`** — Apache-2.0. The charting engine. Carries an attribution condition (§5).
- **`dompurify`** — `MPL-2.0 OR Apache-2.0`. Dual-licensed; we rely on the Apache-2.0 option → no copyleft obligation (MPL-2.0 is only file-level copyleft and only if we modified DOMPurify's own source, which we do not).
- **`open-chart` (this app)** — `UNLICENSED` / proprietary. Correct for a paid product.

### 3.2 Rust / Cargo dependencies

Direct crates in `src-tauri/Cargo.toml`:

| Crate | Typical license | Resale impact |
|---|---|---|
| `tauri` 2.11.2 | MIT OR Apache-2.0 | ✅ Permissive |
| `tauri-plugin-log` 2 | MIT OR Apache-2.0 | ✅ Permissive |
| `serde`, `serde_json` | MIT OR Apache-2.0 | ✅ Permissive |
| `log` | MIT OR Apache-2.0 | ✅ Permissive |
| `winreg` | MIT | ✅ Permissive |

The broader Tauri ecosystem is overwhelmingly MIT/Apache-2.0. **Recommended for full rigor:** run `cargo install cargo-license && cargo license` to enumerate the complete transitive crate tree before a major release (low risk, but completes the audit).

---

## 4. Base project license — `crypt0inf0/openalgo-chart` ⚠️

This application is **derived from the open-source project `crypt0inf0/openalgo-chart`** (the README, app name, and feature set match). The upstream license therefore governs our right to modify and resell the whole app — this is **more important than any single dependency**.

**Findings:**

- GitHub License API for `crypt0inf0/openalgo-chart`: **`NONE DETECTED`** — there is **no formal `LICENSE`/`COPYING` file** in the upstream repo. (Repo is **not a fork**; `parent: none`.)
- The upstream **README declares** a license: `## License → MIT`. The same line is preserved in this repo's `README.md` (lines ~162–164).
- **This repo has no root `LICENSE` file** and **no explicit attribution** to the upstream `openalgo-chart` project.

**Interpretation:**

- A clear written **"License: MIT"** statement expresses the author's intent to license under **MIT** — a permissive license that **allows modification, closed-source distribution, and sale**, with the sole condition of **preserving the MIT copyright/permission notice**.
- However, the **absence of a formal LICENSE file** (no named copyright holder, no full license text) is a **genuine ambiguity**. Strictly, code without a LICENSE file defaults to "all rights reserved." The README line is good-faith evidence of MIT, but it is weaker than a proper LICENSE file.

**Risk level:** Low–Medium. MIT is almost certainly the intended license and permits resale, but the informality is the **single biggest open item** in this report.

**Mitigations (see §9):** obtain written confirmation from the upstream author and add proper attribution.

---

## 5. TradingView Lightweight Charts™ (Apache-2.0) — attribution condition

- **License:** Apache-2.0 (formal `LICENSE` present in the package). Permissive; commercial and closed-source use/sale allowed.
- **Condition:** The library requires a **visible attribution link to TradingView** on the chart. This is satisfied via the `attributionLogo` layout option.

**Compliance status — already met ✅:**
- `NOTICE` file present at repo root (TradingView Lightweight Charts™ attribution).
- `attributionLogo: true` set in `src/components/Chart/ChartComponent.tsx` (~line 1824), with an inline "do not disable" comment.
- Compliance work tracked in commit `d95c89f` ("docs: comply with lightweight-charts attribution license").

**Rule going forward:** **Never set `attributionLogo: false` and never remove the `NOTICE` file.** Doing so would breach the Apache-2.0 attribution terms.

---

## 6. The alerts + webhook question (does TradingView's paid-alert model restrict us?)

**Concern:** TradingView charges a subscription for alerts on tradingview.com; our app offers indicator/price alerts **with webhook calls** for free. Is that allowed?

**Answer: Yes — fully legal. ✅** Reasoning:

1. **The library license does not restrict features.** `lightweight-charts` is Apache-2.0, a permissive license. It places **no restriction** on what functionality we build on top, and **no "non-compete"** clause.
2. **The library has no alert capability at all.** `lightweight-charts` is purely a **rendering** library. Our alert engine (`src/services/globalAlertMonitor.ts`), webhook dispatch, and indicator evaluation are **100% our own original code** — no TradingView alert code is used.
3. **TradingView's subscription pricing applies to their hosted platform** (tradingview.com), a separate commercial service. Their pricing model has **no legal bearing** on software we build with their open-source library. The governing instrument is the **library's Apache-2.0 license**, not the website's subscription terms.
4. **TradingView's website Terms of Service do not apply** — we do not consume tradingview.com data, accounts, or APIs. Our market data comes from **OpenAlgo**.

**Caveat — trademark, not copyright:** "TradingView" and its logo are **trademarks**. Keep the required attribution link, but **do not** brand/market our product as "TradingView" or imply official affiliation or endorsement.

---

## 7. OpenAlgo backend (AGPL-3.0) — connect, don't bundle

- OpenAlgo is licensed **AGPL-3.0** (strong copyleft with a network clause).
- **Open Chart does not include or link OpenAlgo's code** — it communicates with OpenAlgo over a documented REST/WebSocket API as an independent client.
- Acting as a **network client** of an AGPL service **does not** impose AGPL on our proprietary client. AGPL obligations fall on whoever distributes/operates the OpenAlgo software itself.

**Rule:** **Do not bundle, embed, or redistribute OpenAlgo** inside the paid installer. Instruct customers to install OpenAlgo separately. As long as we only connect to it, our app stays proprietary.

*(Historical note: the AGPL `pinets`/Pine Script dependency was deliberately removed in commit `9d6bdfd` — good hygiene already in place.)*

---

## 8. Microsoft WebView2 runtime

- The desktop app renders inside Microsoft Edge **WebView2** (ships with Windows 10/11).
- WebView2 is Microsoft-proprietary but **freely redistributable for commercial applications** under Microsoft's distribution terms; no license fee.
- We link to the runtime; we do not modify or rebrand it. ✅ No issue.

---

## 9. Action items before commercial sale

| # | Item | Priority | Status |
|---|---|---|---|
| 1 | Get **written confirmation** from `crypt0inf0` that `openalgo-chart` is MIT (email / GitHub issue), since there is no formal upstream LICENSE file | **High** | ☐ To do |
| 2 | Add an **attribution/credit** to the upstream `openalgo-chart` (MIT) project in `NOTICE` and/or an in-app "About → Third-party licenses" screen | **High** | ☐ To do |
| 3 | Add a proper **`LICENSE`/EULA** for our own product (proprietary commercial terms: no redistribution, refund, liability, warranty disclaimer) and wire it into the installer (`open-chart.iss` `LicenseFile=`) | **High** | ☐ To do |
| 4 | Keep `lightweight-charts` attribution: `attributionLogo: true` + `NOTICE` | **Mandatory / ongoing** | ✅ Done |
| 5 | Do **not** bundle OpenAlgo (AGPL) in the installer; document "install OpenAlgo separately" | **Mandatory** | ✅ Current behavior |
| 6 | Do not use "TradingView" branding in product/marketing; avoid implying affiliation | **Mandatory** | ☐ Verify marketing |
| 7 | (Rigor) Run `cargo license` to enumerate the full transitive Rust crate tree | Medium | ☐ Optional |
| 8 | (Recommended) One-time review by an IP/software lawyer before scaling sales | Medium | ☐ Recommended |

---

## 10. Summary

- **Sellable as a paid desktop application:** **Yes.** ✅
- **Source-disclosure obligation:** **None** — all shipped code is permissive (MIT / ISC / Apache-2.0 / MPL-or-Apache).
- **Alerts + webhooks:** **Legal to offer**, including for free — our own code, and the Apache-2.0 library imposes no feature restriction.
- **Must maintain:** lightweight-charts attribution; keep OpenAlgo external (not bundled); no TradingView branding.
- **Biggest open item:** the base `openalgo-chart` repo declares MIT only in its README with **no formal LICENSE file** — confirm with the author and add attribution.

---

*This report reflects the dependency/source state of Open Chart v1.0.5 as of 2026-06-05. Re-audit when adding new dependencies, upgrading `lightweight-charts`, or changing the data backend. Not a substitute for legal advice.*
