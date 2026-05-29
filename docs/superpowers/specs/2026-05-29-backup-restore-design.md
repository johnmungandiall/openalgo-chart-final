# Backup & Restore — Design Spec

**Date:** 2026-05-29
**Status:** Approved (brainstorming → ready for implementation plan)

## Purpose

Let the user save their personal chart configuration to a JSON file and restore
it later — on the same machine, a new machine, or after a localStorage wipe.
The bundle is structured by **category**; both export and import let the user
tick which categories to include.

## Decisions made during brainstorming

| Question | Choice |
|---|---|
| Scope | User picks categories at export/import time (checkboxes) |
| UI placement | New "Backup & Restore" section in the Settings dialog |
| Import behavior | Replace entire category, with a confirmation warning that names what will be lost |

## Bundle format

A single JSON file:

```jsonc
{
  "app": "openalgo-chart",
  "version": 1,
  "exportedAt": "2026-05-29T08:00:00.000Z",
  "categories": {
    "appearance":    { "tv_theme": "dark", "tv_chart_appearance": { ... } },
    "intervals":     { "tv_interval": "1m", "tv_fav_intervals_v2": [ ... ], "tv_custom_intervals": [ ... ], "tv_last_nonfav_interval": "5m" },
    "alerts":        { "tv_alerts": [ ... ], "tv_chart_alerts": [ ... ], "tv_alert_logs": [ ... ] },
    "watchlist":     { "tv_watchlist": [ ... ], "tv_watchlists": [ ... ], "tv_watchlist_width": 240 },
    "drawings":      { "tv_drawing_defaults": { ... }, "tv_drawing_templates": [ ... ], "tv_favorite_drawing_tools": [ ... ], "tv_floating_toolbar_pos": { ... } },
    "templates":     { "tv_layout_templates": [ ... ], "tv_template_favorites": [ ... ] },
    "symbols":       { "tv_symbol_favorites": [ ... ], "tv_recent_symbols": [ ... ] },
    "workspace":     { "openalgo-workspace-storage": { /* Zustand persist payload */ } },
    "panels":        { "tv_account_panel_open": true, "tv_account_panel_height": 200, "tv_position_tracker_settings": { ... } },
    "optionChain":   { "optionChainStrikeCount": 10, "tv_show_oi_lines": true, "oi_history": { ... }, "oi_current": { ... } },
    "credentials":   { "oa_apikey": "...", "oa_host_url": "...", "oa_ws_url": "...", "oa_username": "..." }
  }
}
```

- Top-level `app` must be `"openalgo-chart"` and `version` must be a known integer.
- `exportedAt` is purely informational (shown in the import confirmation).
- Each value under a category is the value read from `localStorage`, passed
  through `JSON.parse`; if parsing throws (e.g. the value is the bare string
  `dark`), the original string is stored as-is. On import the inverse is done:
  non-string values are `JSON.stringify`'d before `localStorage.setItem`,
  strings are written verbatim.
- Suggested filename: `openalgo-chart-backup-YYYY-MM-DD.json`.

## Categories → localStorage keys

The mapping is the single source of truth, defined in
`src/constants/backupCategories.ts`. Keys come from `src/constants/storageKeys.ts`
plus the Zustand workspace persist name.

| Category | UI Label | Keys (`STORAGE_KEYS.*` unless noted) | Default at export |
|---|---|---|---|
| `appearance` | Appearance & theme | `THEME`, `CHART_APPEARANCE` | ☑ |
| `intervals` | Intervals & favorites | `INTERVAL`, `LAST_NONFAV_INTERVAL`, `FAV_INTERVALS`, `CUSTOM_INTERVALS` | ☑ |
| `alerts` | Alerts | `ALERTS`, `CHART_ALERTS`, `ALERT_LOGS` | ☑ |
| `watchlist` | Watchlist | `WATCHLIST`, `WATCHLISTS`, `WATCHLIST_WIDTH` | ☑ |
| `drawings` | Drawings & tools | `DRAWING_DEFAULTS`, `DRAWING_TEMPLATES`, `FAVORITE_DRAWING_TOOLS`, `FLOATING_TOOLBAR_POS` | ☑ |
| `templates` | Chart templates & layouts | `LAYOUT_TEMPLATES`, `TEMPLATE_FAVORITES`, `SAVED_LAYOUT` | ☑ |
| `symbols` | Symbol history & favorites | `SYMBOL_FAVORITES`, `RECENT_SYMBOLS`, `RECENT_COMMANDS` | ☑ |
| `workspace` | Workspace (charts, indicators, layouts) | `"openalgo-workspace-storage"` (Zustand persist) | ☑ |
| `panels` | Panel state | `ACCOUNT_PANEL_OPEN`, `ACCOUNT_PANEL_HEIGHT`, `POSITION_TRACKER_SETTINGS` | ☑ |
| `optionChain` | Option chain settings | `OPTION_CHAIN_STRIKE_COUNT`, `SHOW_OI_LINES`, `OI_HISTORY`, `OI_CURRENT` | ☑ |
| `credentials` | **Credentials (API key, host URLs)** ⚠️ | `OA_API_KEY`, `OA_HOST_URL`, `OA_WS_URL`, `OA_USERNAME` | ☐ |

`OA_LOG_LEVEL` and `CLOUD_SYNC_DONE` are intentionally excluded (operational, not
user-meaningful).

## UI placement & flows

A new `BackupRestoreSection` is rendered in `SettingsPopup.tsx` alongside the
existing sections (`OPENALGO CONNECTION`, etc.). It contains two buttons:
**Export…** and **Import…**.

### Export flow

1. User clicks **Export…** → `ExportDialog` modal opens.
2. The modal lists every category with a checkbox and a one-line description.
   - All categories checked by default **except** `credentials`, which is
     unchecked and labeled with a small warning ("Contains your broker API key.
     Do not share this file if checked.").
   - "Select all / none" link in the header.
3. **Export** button is disabled when zero categories are selected.
4. On confirm:
   - `buildBundle(selectedCategories)` reads the relevant localStorage keys,
     `JSON.parse` each value when possible, assembles the bundle object.
   - A Blob is created and a hidden `<a download>` triggers the download as
     `openalgo-chart-backup-YYYY-MM-DD.json` (date in local time).

### Import flow

1. User clicks **Import…** → file picker (`<input type="file" accept="application/json">`).
2. Selected file is read with `FileReader.readAsText`.
3. `parseBundle(text)` validates:
   - Valid JSON.
   - Top-level `app === "openalgo-chart"`.
   - `version` is a known integer (currently `1`).
   - `categories` is an object.
   - **Any validation failure → error toast, modal does not open, no change.**
4. `ImportDialog` modal opens showing the same category list as export.
   - Checkboxes are **disabled** (greyed) for categories the file does not
     contain; their label has a "(not in file)" suffix.
   - Categories present in the file are checked by default; `credentials` is
     **unchecked by default** even when present in the file (forces a deliberate
     action).
   - Header shows `Exported at <exportedAt>` for context.
5. User picks categories → clicks **Continue**.
6. **Confirmation step** (same modal, second pane): for each selected category,
   show a one-line summary of what will be replaced. For categories whose top
   level is an array (alerts, watchlists, drawings, etc.) the line names the
   counts: "Alerts: 15 existing alerts will be overwritten with 8 from the
   file." For categories whose values are scalar settings (appearance, panels)
   the line is "Appearance: 2 settings will be overwritten." Categories with no
   existing data say "Appearance: no existing data, 2 settings will be added."
7. User clicks **Replace** (destructive variant, red) → `applyBundle(bundle, selected)`:
   - For each selected category, for each key in the bundle: stringify and
     `localStorage.setItem`. If the bundle value is missing for a key the
     category owns, that key is **left untouched** (no implicit deletion).
   - Failure on any key → toast, but written keys stay (no rollback). Document
     this trade-off in the toast: "Some settings imported successfully; one or
     more keys failed. Reload to check state."
8. If the `workspace` category was applied → call `location.reload()` so the
   Zustand `persist` middleware re-hydrates cleanly. Otherwise the modal closes
   and a success toast appears. (Most categories are read live via context /
   storage subscriptions; only the Zustand store needs a reload.)

## File-level structure

```
src/
  constants/
    backupCategories.ts        (new — category → keys map + UI labels)
  services/
    backupService.ts           (new — pure: buildBundle, parseBundle, applyBundle)
  components/
    Settings/
      SettingsPopup.tsx        (modified — render BackupRestoreSection)
      sections/
        BackupRestoreSection.tsx   (new — two buttons + open dialogs)
      dialogs/
        ExportDialog.tsx       (new — checkbox modal + download trigger)
        ImportDialog.tsx       (new — file picker → checkboxes → confirm → apply)
```

### `backupService.ts` interface (pure, UI-free)

```ts
export interface Bundle {
  app: 'openalgo-chart';
  version: 1;
  exportedAt: string; // ISO
  categories: Partial<Record<CategoryId, Record<string, unknown>>>;
}

export function buildBundle(selected: CategoryId[]): Bundle;
export function parseBundle(jsonText: string): Bundle; // throws on invalid
export function applyBundle(bundle: Bundle, selected: CategoryId[]): ApplyResult;

export interface ApplyResult {
  writtenKeys: string[];
  failedKeys: string[];
  workspaceTouched: boolean;
}
```

Keeping these three functions UI-free makes them straightforward to unit-test
with Vitest. The dialogs handle file IO, user choice, and toasts; the service
handles the data.

## Edge cases

- **Invalid JSON / wrong `app` / unknown `version`** → error toast, modal does
  not open, no localStorage write.
- **File has extra/unknown categories** → ignored (forwards-compatibility for
  later versions).
- **File missing categories the current schema has** → those checkboxes
  disabled, no error.
- **Empty selection on export or import** → primary button disabled.
- **Credentials toggling** — unchecked by default in both directions, with a
  warning label, so the user must opt in twice (once at export, once at import).
- **Storage write failure** mid-apply → see flow step 7 above.
- **Workspace import** → triggers `location.reload()` so the Zustand store
  re-hydrates. We accept the slight UX cost because partial in-memory state vs.
  freshly written persisted state would otherwise diverge until refresh.
- **Filename collisions on download** — browser handles by appending a counter;
  we don't intervene.

## Testing

Vitest unit tests in `src/__tests__/backupService.test.ts`:

1. `buildBundle` reads selected categories, omits unselected, packs raw values.
2. `parseBundle` accepts a valid bundle; rejects bad JSON, wrong `app`, unknown
   `version`, non-object `categories`.
3. `applyBundle` writes only selected categories; reports `writtenKeys` and
   `failedKeys`; sets `workspaceTouched` correctly.
4. Round-trip: build → stringify → parse → apply against a fresh localStorage
   mock → all keys present and equal.

No new E2E tests; the dialogs themselves are thin shells over the service.

## Out of scope (YAGNI)

- Encryption / password-protected bundles.
- Merge mode (Replace-only per the brainstorming decision).
- Cloud sync, auto-backup, or scheduled exports.
- Bundle-version migrations (only `version: 1` exists).
- Selective per-item import (e.g., "import only these 3 alerts").
- Drag-and-drop file import (file picker is sufficient).

## Open questions

None. All scope, UI placement, and import-behavior questions were resolved
during brainstorming.
