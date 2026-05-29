# Backup & Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Project rule — DO NOT auto-commit.** This repository's `CLAUDE.md` says agents must never run `git add`, `git commit`, or `git push` unless the user explicitly asks. Each task ends with a commit step you can show the user; do not execute it without asking. Continue to the next task after the user OKs (or after they say "no commits yet").

**Goal:** Add a Backup & Restore section to the Settings dialog that exports any combination of categorised user data (settings, alerts, watchlist, drawings, templates, workspace, etc.) to a JSON file, and imports such a file back into `localStorage`, replacing the chosen categories with a confirmation step.

**Architecture:** A small pure service (`backupService.ts`) owns the data shape and read/write logic against `localStorage`, driven by a single source of truth (`backupCategories.ts`) that maps each user-facing category to a list of `localStorage` keys. Two thin React dialogs (Export, Import) sit on top of the service. A new `BackupRestoreSection` is added to the existing `SettingsPopup`. The Zustand workspace store rehydrates via `location.reload()` only when the workspace category was applied.

**Tech Stack:** React 19, TypeScript (strict off), Vite, Zustand (existing `persist` middleware), Vitest + jsdom, lightweight-charts. CSS Modules for new components, lucide-react for icons, existing `BaseModal` / `BaseButton` primitives from `src/components/shared`.

**Spec:** `docs/superpowers/specs/2026-05-29-backup-restore-design.md`

---

## File Structure

```
src/
  constants/
    backupCategories.ts                    NEW  category → keys map + UI labels + types
  services/
    backupService.ts                       NEW  pure: buildBundle, parseBundle, applyBundle
  __tests__/
    backupService.test.ts                  NEW  vitest unit + round-trip tests
  components/
    Settings/
      SettingsPopup.tsx                    EDIT add SectionId 'backup', sidebar entry, render block
      sections/
        index.ts                           EDIT re-export BackupRestoreSection
        BackupRestoreSection.tsx           NEW  two buttons that open the dialogs
        BackupRestoreSection.module.css    NEW  thin layout (mirrors OpenAlgoSection)
      dialogs/
        ExportDialog.tsx                   NEW  checkbox modal → download
        ExportDialog.module.css            NEW  shared dialog styles
        ImportDialog.tsx                   NEW  file picker → checkbox modal → confirm → apply
        ImportDialog.module.css            NEW  shared dialog styles
```

Boundaries:
- `backupCategories.ts` is the **only** place that knows the mapping between
  user-facing category names and `localStorage` keys. Everything else imports
  from here.
- `backupService.ts` knows about `localStorage` and the JSON wire format. It
  knows nothing about React.
- The two dialogs know about React, the service, and toasts. They do not read
  or write `localStorage` directly.
- `SettingsPopup.tsx` does not know about the backup feature beyond rendering
  the section component, mirroring how it treats the other sections.

---

## Reference: existing patterns to follow

- **Section components** live in `src/components/Settings/sections/` and are
  re-exported from `src/components/Settings/sections/index.ts`. See
  `OpenAlgoSection.tsx` for the exact JSX + CSS-module shape (`styles.section`,
  `styles.sectionTitle`, `styles.inputGroup`, `styles.input`, etc.).
- **Modals** wrap `BaseModal` from `src/components/shared`. See
  `src/components/ApiKeyDialog/ApiKeyDialog.tsx` for `BaseModal` usage with
  `title`, `size`, `onClose`, `closeOnEscape`.
- **Buttons** use `BaseButton` from `src/components/shared` with
  `variant="primary" | "secondary" | "danger"`, `disabled`, `loading`.
- **Storage keys** live in `src/constants/storageKeys.ts` as `STORAGE_KEYS.*`.
- **Tests** use Vitest with jsdom (see `vitest.config.ts` and `tests/setup.ts`).
  Run a single file: `npx vitest run src/__tests__/backupService.test.ts`.

---

## Task 1: Create the category source of truth

Defines the typed list of categories and their `localStorage` keys. Everything
downstream imports from this one file.

**Files:**
- Create: `src/constants/backupCategories.ts`

- [ ] **Step 1: Create the category map file**

`src/constants/backupCategories.ts`:

```ts
/**
 * Source of truth for the Backup & Restore feature.
 * Maps each user-facing category to the localStorage keys it owns.
 * See: docs/superpowers/specs/2026-05-29-backup-restore-design.md
 */

import { STORAGE_KEYS } from './storageKeys';

export type CategoryId =
  | 'appearance'
  | 'intervals'
  | 'alerts'
  | 'watchlist'
  | 'drawings'
  | 'templates'
  | 'symbols'
  | 'workspace'
  | 'panels'
  | 'optionChain'
  | 'credentials';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  description: string;
  /** localStorage keys this category owns. The first key is treated as the
   *  "primary" key for count-style summaries in the confirmation step. */
  keys: string[];
  /** Default state of the checkbox at export. Credentials are off. */
  defaultChecked: boolean;
  /** Shown in red text near the checkbox when true. */
  sensitive?: boolean;
}

/** Zustand persist name from src/store/workspaceStore.ts (line ~292). */
const WORKSPACE_STORE_KEY = 'openalgo-workspace-storage';

export const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'appearance',
    label: 'Appearance & theme',
    description: 'Theme (dark/light) and chart appearance (colours, fonts).',
    keys: [STORAGE_KEYS.THEME, STORAGE_KEYS.CHART_APPEARANCE],
    defaultChecked: true,
  },
  {
    id: 'intervals',
    label: 'Intervals & favourites',
    description: 'Current interval, favourites, and custom intervals.',
    keys: [
      STORAGE_KEYS.INTERVAL,
      STORAGE_KEYS.LAST_NONFAV_INTERVAL,
      STORAGE_KEYS.FAV_INTERVALS,
      STORAGE_KEYS.CUSTOM_INTERVALS,
    ],
    defaultChecked: true,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    description: 'Saved alerts, chart alerts, and the alert log.',
    keys: [STORAGE_KEYS.ALERTS, STORAGE_KEYS.CHART_ALERTS, STORAGE_KEYS.ALERT_LOGS],
    defaultChecked: true,
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    description: 'Watchlists and sidebar width.',
    keys: [STORAGE_KEYS.WATCHLIST, STORAGE_KEYS.WATCHLISTS, STORAGE_KEYS.WATCHLIST_WIDTH],
    defaultChecked: true,
  },
  {
    id: 'drawings',
    label: 'Drawings & tools',
    description: 'Drawing defaults, templates, favourite tools, toolbar position.',
    keys: [
      STORAGE_KEYS.DRAWING_DEFAULTS,
      STORAGE_KEYS.DRAWING_TEMPLATES,
      STORAGE_KEYS.FAVORITE_DRAWING_TOOLS,
      STORAGE_KEYS.FLOATING_TOOLBAR_POS,
    ],
    defaultChecked: true,
  },
  {
    id: 'templates',
    label: 'Chart templates & layouts',
    description: 'Saved layouts and template favourites.',
    keys: [
      STORAGE_KEYS.LAYOUT_TEMPLATES,
      STORAGE_KEYS.TEMPLATE_FAVORITES,
      STORAGE_KEYS.SAVED_LAYOUT,
    ],
    defaultChecked: true,
  },
  {
    id: 'symbols',
    label: 'Symbol history & favourites',
    description: 'Favourite symbols, recent symbols, recent commands.',
    keys: [
      STORAGE_KEYS.SYMBOL_FAVORITES,
      STORAGE_KEYS.RECENT_SYMBOLS,
      STORAGE_KEYS.RECENT_COMMANDS,
    ],
    defaultChecked: true,
  },
  {
    id: 'workspace',
    label: 'Workspace (charts, indicators, layouts)',
    description: 'Active charts, indicators, panes — the Zustand workspace store. Importing this reloads the page.',
    keys: [WORKSPACE_STORE_KEY],
    defaultChecked: true,
  },
  {
    id: 'panels',
    label: 'Panel state',
    description: 'Account panel size, position tracker settings.',
    keys: [
      STORAGE_KEYS.ACCOUNT_PANEL_OPEN,
      STORAGE_KEYS.ACCOUNT_PANEL_HEIGHT,
      STORAGE_KEYS.POSITION_TRACKER_SETTINGS,
    ],
    defaultChecked: true,
  },
  {
    id: 'optionChain',
    label: 'Option chain settings',
    description: 'Strike count, OI lines toggle, OI history snapshots.',
    keys: [
      STORAGE_KEYS.OPTION_CHAIN_STRIKE_COUNT,
      STORAGE_KEYS.SHOW_OI_LINES,
      STORAGE_KEYS.OI_HISTORY,
      STORAGE_KEYS.OI_CURRENT,
    ],
    defaultChecked: true,
  },
  {
    id: 'credentials',
    label: 'Credentials (API key, host URLs)',
    description: 'Your OpenAlgo API key, REST host, and WebSocket host. Off by default — anyone with this file can use your key.',
    keys: [
      STORAGE_KEYS.OA_API_KEY,
      STORAGE_KEYS.OA_HOST_URL,
      STORAGE_KEYS.OA_WS_URL,
      STORAGE_KEYS.OA_USERNAME,
    ],
    defaultChecked: false,
    sensitive: true,
  },
] as const;

/** Look up a CategoryDef by id. Throws on unknown id (programming error). */
export function getCategory(id: CategoryId): CategoryDef {
  const def = CATEGORIES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown backup category: ${id}`);
  return def;
}

/** The bundle format version this build of the app writes and accepts. */
export const BUNDLE_VERSION = 1 as const;
export const BUNDLE_APP_ID = 'openalgo-chart' as const;
```

- [ ] **Step 2: Type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors related to the new file.

- [ ] **Step 3: Commit (ASK USER FIRST)**

```bash
git add src/constants/backupCategories.ts
git commit -m "feat(backup): add category source of truth"
```

---

## Task 2: `buildBundle` — TDD

The pure read side: takes a list of selected category ids, returns a `Bundle`
object ready to be JSON-stringified.

**Files:**
- Create: `src/services/backupService.ts`
- Create: `src/__tests__/backupService.test.ts`

- [ ] **Step 1: Write the failing test**

`src/__tests__/backupService.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildBundle } from '@/services/backupService';
import { BUNDLE_APP_ID, BUNDLE_VERSION } from '@/constants/backupCategories';
import { STORAGE_KEYS } from '@/constants/storageKeys';

describe('buildBundle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty bundle with valid header when nothing is selected', () => {
    const bundle = buildBundle([]);
    expect(bundle.app).toBe(BUNDLE_APP_ID);
    expect(bundle.version).toBe(BUNDLE_VERSION);
    expect(typeof bundle.exportedAt).toBe('string');
    expect(new Date(bundle.exportedAt).toString()).not.toBe('Invalid Date');
    expect(bundle.categories).toEqual({});
  });

  it('includes only the selected categories', () => {
    localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify([{ id: 'a1' }]));

    const bundle = buildBundle(['appearance']);

    expect(bundle.categories.appearance).toBeDefined();
    expect(bundle.categories.alerts).toBeUndefined();
    expect(bundle.categories.appearance![STORAGE_KEYS.THEME]).toBe('dark');
  });

  it('JSON-parses values when possible, keeps raw strings otherwise', () => {
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify([{ id: 'a1', symbol: 'NIFTY' }]));
    localStorage.setItem(STORAGE_KEYS.THEME, 'dark'); // not valid JSON

    const bundle = buildBundle(['appearance', 'alerts']);

    expect(bundle.categories.alerts![STORAGE_KEYS.ALERTS]).toEqual([
      { id: 'a1', symbol: 'NIFTY' },
    ]);
    expect(bundle.categories.appearance![STORAGE_KEYS.THEME]).toBe('dark');
  });

  it('omits keys that do not exist in localStorage', () => {
    // nothing set
    const bundle = buildBundle(['appearance']);
    expect(bundle.categories.appearance).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/backupService.test.ts`
Expected: FAIL — module `@/services/backupService` does not exist.

- [ ] **Step 3: Implement `buildBundle`**

`src/services/backupService.ts`:

```ts
/**
 * Backup & Restore service — pure, UI-free.
 * See: docs/superpowers/specs/2026-05-29-backup-restore-design.md
 */

import {
  BUNDLE_APP_ID,
  BUNDLE_VERSION,
  CATEGORIES,
  CategoryId,
  getCategory,
} from '@/constants/backupCategories';

export interface Bundle {
  app: typeof BUNDLE_APP_ID;
  version: typeof BUNDLE_VERSION;
  exportedAt: string;
  categories: Partial<Record<CategoryId, Record<string, unknown>>>;
}

function readKey(key: string): unknown | undefined {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function buildBundle(selected: CategoryId[]): Bundle {
  const categories: Bundle['categories'] = {};
  for (const id of selected) {
    const def = getCategory(id);
    const entry: Record<string, unknown> = {};
    for (const key of def.keys) {
      const value = readKey(key);
      if (value !== undefined) entry[key] = value;
    }
    categories[id] = entry;
  }
  return {
    app: BUNDLE_APP_ID,
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    categories,
  };
}

// parseBundle and applyBundle added in later tasks.
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/__tests__/backupService.test.ts`
Expected: PASS — all four `buildBundle` tests green.

- [ ] **Step 5: Commit (ASK USER FIRST)**

```bash
git add src/services/backupService.ts src/__tests__/backupService.test.ts
git commit -m "feat(backup): buildBundle reads selected categories from localStorage"
```

---

## Task 3: `parseBundle` — TDD

Validates and types an unknown JSON string. Throws on anything wrong so callers
have a single error path.

**Files:**
- Modify: `src/services/backupService.ts`
- Modify: `src/__tests__/backupService.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/backupService.test.ts`:

```ts
import { parseBundle } from '@/services/backupService';

describe('parseBundle', () => {
  it('accepts a valid bundle', () => {
    const valid = {
      app: 'openalgo-chart',
      version: 1,
      exportedAt: '2026-05-29T00:00:00.000Z',
      categories: { appearance: { tv_theme: 'dark' } },
    };
    expect(parseBundle(JSON.stringify(valid))).toEqual(valid);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseBundle('{not json')).toThrow(/JSON/i);
  });

  it('rejects wrong app id', () => {
    expect(() =>
      parseBundle(JSON.stringify({ app: 'other-app', version: 1, exportedAt: '', categories: {} }))
    ).toThrow(/app/i);
  });

  it('rejects unknown version', () => {
    expect(() =>
      parseBundle(JSON.stringify({ app: 'openalgo-chart', version: 999, exportedAt: '', categories: {} }))
    ).toThrow(/version/i);
  });

  it('rejects non-object categories', () => {
    expect(() =>
      parseBundle(JSON.stringify({ app: 'openalgo-chart', version: 1, exportedAt: '', categories: [] }))
    ).toThrow(/categories/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/backupService.test.ts -t parseBundle`
Expected: FAIL — `parseBundle is not exported`.

- [ ] **Step 3: Implement `parseBundle`**

Add to `src/services/backupService.ts` (above the trailing `export { CATEGORIES }`):

```ts
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseBundle(jsonText: string): Bundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Not a valid JSON file: ${(err as Error).message}`);
  }
  if (!isPlainObject(parsed)) {
    throw new Error('Bundle root must be a JSON object.');
  }
  if (parsed.app !== BUNDLE_APP_ID) {
    throw new Error(
      `Unrecognised file: expected app "${BUNDLE_APP_ID}" but got "${String(parsed.app)}".`
    );
  }
  if (parsed.version !== BUNDLE_VERSION) {
    throw new Error(
      `Unsupported bundle version ${String(parsed.version)} (this build understands version ${BUNDLE_VERSION}).`
    );
  }
  if (!isPlainObject(parsed.categories)) {
    throw new Error('Bundle "categories" must be an object.');
  }
  return parsed as unknown as Bundle;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/__tests__/backupService.test.ts`
Expected: PASS — both describe blocks green.

- [ ] **Step 5: Commit (ASK USER FIRST)**

```bash
git add src/services/backupService.ts src/__tests__/backupService.test.ts
git commit -m "feat(backup): parseBundle validates app id, version, categories"
```

---

## Task 4: `applyBundle` — TDD

The write side: takes a parsed bundle and a list of selected categories,
writes the keys back to `localStorage`. Returns a result describing what
happened so the UI can show a toast and decide whether to reload.

**Files:**
- Modify: `src/services/backupService.ts`
- Modify: `src/__tests__/backupService.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/backupService.test.ts`:

```ts
import { applyBundle } from '@/services/backupService';
import type { Bundle } from '@/services/backupService';

const mkBundle = (categories: Bundle['categories']): Bundle => ({
  app: 'openalgo-chart',
  version: 1,
  exportedAt: '2026-05-29T00:00:00.000Z',
  categories,
});

describe('applyBundle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes only keys for selected categories', () => {
    const bundle = mkBundle({
      appearance: { tv_theme: 'light' },
      alerts: { tv_alerts: [{ id: 'a1' }] },
    });

    const result = applyBundle(bundle, ['appearance']);

    expect(localStorage.getItem('tv_theme')).toBe('light');
    expect(localStorage.getItem('tv_alerts')).toBeNull();
    expect(result.writtenKeys).toContain('tv_theme');
    expect(result.workspaceTouched).toBe(false);
  });

  it('JSON.stringifies non-string values; writes strings verbatim', () => {
    const bundle = mkBundle({
      appearance: { tv_theme: 'dark' },
      alerts: { tv_alerts: [{ id: 'a1', symbol: 'NIFTY' }] },
    });

    applyBundle(bundle, ['appearance', 'alerts']);

    expect(localStorage.getItem('tv_theme')).toBe('dark');
    expect(localStorage.getItem('tv_alerts')).toBe(
      JSON.stringify([{ id: 'a1', symbol: 'NIFTY' }])
    );
  });

  it('reports workspaceTouched when the workspace category is applied', () => {
    const bundle = mkBundle({
      workspace: { 'openalgo-workspace-storage': { state: {}, version: 0 } },
    });
    const result = applyBundle(bundle, ['workspace']);
    expect(result.workspaceTouched).toBe(true);
  });

  it('leaves keys the bundle does not contain untouched', () => {
    localStorage.setItem('tv_chart_appearance', JSON.stringify({ existing: true }));
    const bundle = mkBundle({ appearance: { tv_theme: 'light' } });

    applyBundle(bundle, ['appearance']);

    // tv_chart_appearance was NOT in the bundle's appearance category,
    // so it must remain.
    expect(JSON.parse(localStorage.getItem('tv_chart_appearance')!)).toEqual({
      existing: true,
    });
  });

  it('silently skips selected categories that are missing from the bundle', () => {
    const bundle = mkBundle({});
    const result = applyBundle(bundle, ['appearance']);
    expect(result.writtenKeys).toEqual([]);
    expect(result.failedKeys).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/backupService.test.ts -t applyBundle`
Expected: FAIL — `applyBundle is not exported`.

- [ ] **Step 3: Implement `applyBundle`**

Add to `src/services/backupService.ts`:

```ts
export interface ApplyResult {
  writtenKeys: string[];
  failedKeys: string[];
  /** True if any key from the 'workspace' category was written.
   *  The Zustand persist middleware only re-reads on mount,
   *  so callers should reload the page when this is true. */
  workspaceTouched: boolean;
}

function writeKey(key: string, value: unknown): boolean {
  try {
    const toStore = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, toStore);
    return true;
  } catch {
    return false;
  }
}

export function applyBundle(bundle: Bundle, selected: CategoryId[]): ApplyResult {
  const writtenKeys: string[] = [];
  const failedKeys: string[] = [];
  let workspaceTouched = false;

  for (const id of selected) {
    const entry = bundle.categories[id];
    if (!entry) continue; // selected but not in file → no-op
    for (const [key, value] of Object.entries(entry)) {
      if (writeKey(key, value)) {
        writtenKeys.push(key);
        if (id === 'workspace') workspaceTouched = true;
      } else {
        failedKeys.push(key);
      }
    }
  }

  return { writtenKeys, failedKeys, workspaceTouched };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/__tests__/backupService.test.ts`
Expected: PASS — all three describe blocks green (buildBundle, parseBundle, applyBundle).

- [ ] **Step 5: Commit (ASK USER FIRST)**

```bash
git add src/services/backupService.ts src/__tests__/backupService.test.ts
git commit -m "feat(backup): applyBundle writes selected categories back to localStorage"
```

---

## Task 5: Round-trip test

Catches accidental asymmetries between `buildBundle` and `applyBundle` — the
single regression most likely to break this feature later.

**Files:**
- Modify: `src/__tests__/backupService.test.ts`

- [ ] **Step 1: Append the round-trip test**

```ts
describe('round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('build → JSON → parse → apply restores original values', () => {
    // Arrange: a representative mix of array, object, and string values.
    localStorage.setItem('tv_theme', 'light');
    localStorage.setItem(
      'tv_chart_appearance',
      JSON.stringify({ candleUp: '#0f0', candleDown: '#f00' })
    );
    localStorage.setItem(
      'tv_alerts',
      JSON.stringify([{ id: 'a1', symbol: 'NIFTY', price: 22000 }])
    );

    const original = {
      tv_theme: localStorage.getItem('tv_theme'),
      tv_chart_appearance: localStorage.getItem('tv_chart_appearance'),
      tv_alerts: localStorage.getItem('tv_alerts'),
    };

    // Build, stringify, parse, apply to a fresh store.
    const bundle = buildBundle(['appearance', 'alerts']);
    const text = JSON.stringify(bundle);
    localStorage.clear();
    const parsed = parseBundle(text);
    applyBundle(parsed, ['appearance', 'alerts']);

    expect(localStorage.getItem('tv_theme')).toBe(original.tv_theme);
    expect(localStorage.getItem('tv_chart_appearance')).toBe(original.tv_chart_appearance);
    expect(localStorage.getItem('tv_alerts')).toBe(original.tv_alerts);
  });
});
```

- [ ] **Step 2: Run the new test**

Run: `npx vitest run src/__tests__/backupService.test.ts -t round-trip`
Expected: PASS.

- [ ] **Step 3: Run the full suite once**

Run: `npm test -- --run src/__tests__/backupService.test.ts`
Expected: 1 file, all tests green.

- [ ] **Step 4: Commit (ASK USER FIRST)**

```bash
git add src/__tests__/backupService.test.ts
git commit -m "test(backup): round-trip build → parse → apply"
```

---

## Task 6: ExportDialog component

Modal with category checkboxes that downloads a JSON file when confirmed.

**Files:**
- Create: `src/components/Settings/dialogs/ExportDialog.tsx`
- Create: `src/components/Settings/dialogs/ExportDialog.module.css`

- [ ] **Step 1: Create the CSS module**

`src/components/Settings/dialogs/ExportDialog.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.item {
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--tv-color-border);
  border-radius: 4px;
  cursor: pointer;
  align-items: flex-start;
}

.item:hover {
  background: var(--tv-color-row-hover);
}

.checkbox {
  margin-top: 3px;
}

.label {
  font-size: 13px;
  color: var(--tv-color-text-primary);
  font-weight: 500;
}

.description {
  font-size: 11px;
  color: var(--tv-color-text-secondary);
  margin-top: 2px;
  line-height: 1.4;
}

.sensitive .label {
  color: var(--tv-color-down);
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 12px;
}

.link {
  color: var(--tv-color-brand);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
```

- [ ] **Step 2: Create the dialog component**

`src/components/Settings/dialogs/ExportDialog.tsx`:

```tsx
import React, { useState, useMemo } from 'react';
import { BaseModal, BaseButton } from '../../shared';
import { CATEGORIES, CategoryId } from '@/constants/backupCategories';
import { buildBundle } from '@/services/backupService';
import styles from './ExportDialog.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function todayFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `openalgo-chart-backup-${y}-${m}-${day}.json`;
}

function download(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ExportDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const [selected, setSelected] = useState<Set<CategoryId>>(
    () => new Set(CATEGORIES.filter((c) => c.defaultChecked).map((c) => c.id))
  );

  const allSelected = useMemo(
    () => selected.size === CATEGORIES.length,
    [selected]
  );

  const toggle = (id: CategoryId): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setAll = (on: boolean): void => {
    setSelected(on ? new Set(CATEGORIES.map((c) => c.id)) : new Set());
  };

  const handleExport = (): void => {
    const bundle = buildBundle(Array.from(selected));
    download(JSON.stringify(bundle, null, 2), todayFilename());
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export settings"
      size="medium"
      closeOnEscape
    >
      <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--tv-color-text-secondary)' }}>
        Pick the categories to include in the backup file.
      </p>

      <div className={styles.header}>
        <span>{selected.size} of {CATEGORIES.length} selected</span>
        <button
          type="button"
          className={styles.link}
          onClick={() => setAll(!allSelected)}
        >
          {allSelected ? 'Select none' : 'Select all'}
        </button>
      </div>

      <div className={styles.list}>
        {CATEGORIES.map((cat) => (
          <label
            key={cat.id}
            className={`${styles.item} ${cat.sensitive ? styles.sensitive : ''}`}
          >
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={selected.has(cat.id)}
              onChange={() => toggle(cat.id)}
            />
            <div>
              <div className={styles.label}>
                {cat.label}{cat.sensitive ? ' ⚠' : ''}
              </div>
              <div className={styles.description}>{cat.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className={styles.footer}>
        <BaseButton variant="secondary" onClick={onClose}>Cancel</BaseButton>
        <BaseButton
          variant="primary"
          disabled={selected.size === 0}
          onClick={handleExport}
        >
          Export
        </BaseButton>
      </div>
    </BaseModal>
  );
};

export default ExportDialog;
```

- [ ] **Step 3: Type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit (ASK USER FIRST)**

```bash
git add src/components/Settings/dialogs/ExportDialog.tsx src/components/Settings/dialogs/ExportDialog.module.css
git commit -m "feat(backup): ExportDialog with category checkboxes"
```

---

## Task 7: ImportDialog component

File picker → parse → checkbox modal (categories present in the file) →
confirmation step listing what will be replaced → apply.

**Files:**
- Create: `src/components/Settings/dialogs/ImportDialog.tsx`
- Create: `src/components/Settings/dialogs/ImportDialog.module.css`

- [ ] **Step 1: Create the CSS module**

`src/components/Settings/dialogs/ImportDialog.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.item {
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--tv-color-border);
  border-radius: 4px;
  align-items: flex-start;
}

.itemEnabled { cursor: pointer; }
.itemEnabled:hover { background: var(--tv-color-row-hover); }
.itemDisabled { opacity: 0.45; cursor: not-allowed; }

.checkbox { margin-top: 3px; }

.label { font-size: 13px; color: var(--tv-color-text-primary); font-weight: 500; }
.description { font-size: 11px; color: var(--tv-color-text-secondary); margin-top: 2px; line-height: 1.4; }
.missing { font-style: italic; }
.sensitive .label { color: var(--tv-color-down); }

.exportedAt { font-size: 11px; color: var(--tv-color-text-secondary); margin: 0 0 8px 0; }

.error {
  margin: 0 0 12px 0;
  padding: 8px 10px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid var(--tv-color-down);
  color: var(--tv-color-down);
  border-radius: 4px;
  font-size: 12px;
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--tv-color-text-primary);
  margin: 8px 0 16px 0;
}
.summary li { list-style: disc; margin-left: 20px; }

.footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
```

- [ ] **Step 2: Create the dialog component**

`src/components/Settings/dialogs/ImportDialog.tsx`:

```tsx
import React, { useState, useRef, useMemo } from 'react';
import { BaseModal, BaseButton } from '../../shared';
import { CATEGORIES, CategoryId } from '@/constants/backupCategories';
import { parseBundle, applyBundle } from '@/services/backupService';
import type { Bundle } from '@/services/backupService';
import styles from './ImportDialog.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Stage = 'picking' | 'choosing' | 'confirming';

const ImportDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('picking');
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set());
  const [error, setError] = useState<string>('');

  // Reset when closed so a re-open starts clean.
  const handleClose = (): void => {
    setStage('picking');
    setBundle(null);
    setSelected(new Set());
    setError('');
    onClose();
  };

  const pickFile = (): void => fileInputRef.current?.click();

  const handleFile = async (file: File): Promise<void> => {
    setError('');
    try {
      const text = await file.text();
      const parsed = parseBundle(text);
      setBundle(parsed);
      // Pre-select every category present in the file EXCEPT credentials.
      const present = (Object.keys(parsed.categories) as CategoryId[]).filter(
        (id) => parsed.categories[id] !== undefined
      );
      const def = new Set(present.filter((id) => id !== 'credentials'));
      setSelected(def);
      setStage('choosing');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggle = (id: CategoryId): void => {
    if (!bundle?.categories[id]) return; // disabled
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build the "what will be replaced" lines for the confirmation step.
  const summaryLines = useMemo(() => {
    if (!bundle) return [];
    return Array.from(selected).map((id) => {
      const def = CATEGORIES.find((c) => c.id === id)!;
      const incoming = bundle.categories[id] ?? {};
      const primaryKey = def.keys[0]!;
      const incomingPrimary = incoming[primaryKey];
      const existingRaw = localStorage.getItem(primaryKey);
      const existing = existingRaw ? safeParse(existingRaw) : undefined;

      if (Array.isArray(incomingPrimary) && Array.isArray(existing)) {
        return `${def.label}: ${existing.length} existing → ${incomingPrimary.length} from file.`;
      }
      if (Array.isArray(incomingPrimary)) {
        return `${def.label}: no existing data, ${incomingPrimary.length} items will be added.`;
      }
      const incomingCount = Object.keys(incoming).length;
      const existingCount = def.keys.filter((k) => localStorage.getItem(k) !== null).length;
      if (existingCount === 0) {
        return `${def.label}: no existing data, ${incomingCount} setting(s) will be added.`;
      }
      return `${def.label}: ${existingCount} existing setting(s) will be overwritten with ${incomingCount} from the file.`;
    });
  }, [bundle, selected]);

  const handleApply = (): void => {
    if (!bundle) return;
    const result = applyBundle(bundle, Array.from(selected));
    if (result.failedKeys.length > 0) {
      setError(
        `Some keys failed to write: ${result.failedKeys.join(', ')}. ` +
          `The other ${result.writtenKeys.length} key(s) were applied.`
      );
      return;
    }
    if (result.workspaceTouched) {
      // Zustand persist re-hydrates on mount, so reload picks up the new state.
      window.location.reload();
      return;
    }
    handleClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import settings"
      size="medium"
      closeOnEscape
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          // Reset so picking the same file twice re-fires onChange.
          e.target.value = '';
        }}
      />

      {error && <p className={styles.error}>{error}</p>}

      {stage === 'picking' && (
        <>
          <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--tv-color-text-secondary)' }}>
            Pick a backup JSON file exported from this app.
          </p>
          <div className={styles.footer}>
            <BaseButton variant="secondary" onClick={handleClose}>Cancel</BaseButton>
            <BaseButton variant="primary" onClick={pickFile}>Choose file…</BaseButton>
          </div>
        </>
      )}

      {stage === 'choosing' && bundle && (
        <>
          <p className={styles.exportedAt}>
            File exported at {bundle.exportedAt}
          </p>
          <div className={styles.list}>
            {CATEGORIES.map((cat) => {
              const inFile = bundle.categories[cat.id] !== undefined;
              return (
                <label
                  key={cat.id}
                  className={`${styles.item} ${inFile ? styles.itemEnabled : styles.itemDisabled} ${cat.sensitive ? styles.sensitive : ''}`}
                >
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    disabled={!inFile}
                    checked={selected.has(cat.id)}
                    onChange={() => toggle(cat.id)}
                  />
                  <div>
                    <div className={styles.label}>
                      {cat.label}{cat.sensitive ? ' ⚠' : ''}
                      {!inFile && <span className={styles.missing}> (not in file)</span>}
                    </div>
                    <div className={styles.description}>{cat.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className={styles.footer}>
            <BaseButton variant="secondary" onClick={handleClose}>Cancel</BaseButton>
            <BaseButton
              variant="primary"
              disabled={selected.size === 0}
              onClick={() => setStage('confirming')}
            >
              Continue
            </BaseButton>
          </div>
        </>
      )}

      {stage === 'confirming' && bundle && (
        <>
          <p style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--tv-color-text-primary)', fontWeight: 500 }}>
            Importing will overwrite the following.
          </p>
          <ul className={styles.summary}>
            {summaryLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <div className={styles.footer}>
            <BaseButton variant="secondary" onClick={() => setStage('choosing')}>Back</BaseButton>
            <BaseButton variant="danger" onClick={handleApply}>Replace</BaseButton>
          </div>
        </>
      )}
    </BaseModal>
  );
};

function safeParse(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return raw; }
}

export default ImportDialog;
```

- [ ] **Step 3: Type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit (ASK USER FIRST)**

```bash
git add src/components/Settings/dialogs/ImportDialog.tsx src/components/Settings/dialogs/ImportDialog.module.css
git commit -m "feat(backup): ImportDialog with file picker, category gating, and replace confirmation"
```

---

## Task 8: BackupRestoreSection component

The Settings-dialog section that owns the dialog open/close state and renders
the two buttons.

**Files:**
- Create: `src/components/Settings/sections/BackupRestoreSection.tsx`
- Create: `src/components/Settings/sections/BackupRestoreSection.module.css`
- Modify: `src/components/Settings/sections/index.ts`

- [ ] **Step 1: Create the CSS module**

`src/components/Settings/sections/BackupRestoreSection.module.css`:

```css
.section { padding: 16px; }
.sectionTitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--tv-color-text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin: 0 0 16px 0;
}
.intro {
  font-size: 13px;
  color: var(--tv-color-text-secondary);
  line-height: 1.5;
  margin: 0 0 16px 0;
}
.buttons { display: flex; gap: 12px; }
```

- [ ] **Step 2: Create the section component**

`src/components/Settings/sections/BackupRestoreSection.tsx`:

```tsx
import React, { useState } from 'react';
import { BaseButton } from '../../shared';
import ExportDialog from '../dialogs/ExportDialog';
import ImportDialog from '../dialogs/ImportDialog';
import styles from './BackupRestoreSection.module.css';

const BackupRestoreSection: React.FC = () => {
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>BACKUP &amp; RESTORE</h3>
      <p className={styles.intro}>
        Save your chart settings, alerts, watchlists, drawings, templates, and
        workspace to a JSON file — or restore them from a previous backup.
        Credentials (API key, host URLs) are excluded by default; check the
        Credentials box only if you intend to move them between machines.
      </p>
      <div className={styles.buttons}>
        <BaseButton variant="primary" onClick={() => setExportOpen(true)}>
          Export…
        </BaseButton>
        <BaseButton variant="secondary" onClick={() => setImportOpen(true)}>
          Import…
        </BaseButton>
      </div>

      <ExportDialog isOpen={exportOpen} onClose={() => setExportOpen(false)} />
      <ImportDialog isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};

export default BackupRestoreSection;
```

- [ ] **Step 3: Re-export from `sections/index.ts`**

Open `src/components/Settings/sections/index.ts`. It uses the import-then-export
style; preserve it. Final file:

```ts
/**
 * Settings Sections Index
 */
import ScalesSection from './ScalesSection';
import OpenAlgoSection from './OpenAlgoSection';
import LoggingSection from './LoggingSection';
import AppearanceSection from './AppearanceSection';
import SymbolSection from './SymbolSection';
import BackupRestoreSection from './BackupRestoreSection';

export {
    ScalesSection,
    OpenAlgoSection,
    LoggingSection,
    AppearanceSection,
    SymbolSection,
    BackupRestoreSection,
};
```

- [ ] **Step 4: Type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit (ASK USER FIRST)**

```bash
git add src/components/Settings/sections/BackupRestoreSection.tsx \
        src/components/Settings/sections/BackupRestoreSection.module.css \
        src/components/Settings/sections/index.ts
git commit -m "feat(backup): BackupRestoreSection wraps Export/Import dialogs"
```

---

## Task 9: Wire into SettingsPopup

Add `'backup'` to the `SectionId` union, add a sidebar entry with an icon, and
render the new section in the conditional chain.

**Files:**
- Modify: `src/components/Settings/SettingsPopup.tsx`

- [ ] **Step 1: Add the import and update the SectionId union**

In `src/components/Settings/SettingsPopup.tsx`:

Find line ~12:
```ts
import { ScalesSection, OpenAlgoSection, LoggingSection, AppearanceSection, SymbolSection } from './sections';
```
Replace with:
```ts
import { ScalesSection, OpenAlgoSection, LoggingSection, AppearanceSection, SymbolSection, BackupRestoreSection } from './sections';
```

Find line ~18:
```ts
type SectionId = 'symbol' | 'scales' | 'openalgo' | 'logging' | 'appearance' | 'shortcuts';
```
Replace with:
```ts
type SectionId = 'symbol' | 'scales' | 'openalgo' | 'logging' | 'appearance' | 'shortcuts' | 'backup';
```

Also add the icon import. Find the existing lucide-react import (line ~5):
```ts
import { X, Keyboard } from 'lucide-react';
```
Replace with:
```ts
import { X, Keyboard, DatabaseBackup } from 'lucide-react';
```

- [ ] **Step 2: Add the sidebar entry**

Find the `sections` array (search for `const sections: Section[] = [` around
line ~154). Add a new entry at the end (before the closing `];`):

```ts
{ id: 'backup', label: 'Backup & Restore', icon: <DatabaseBackup size={16} /> },
```

(If a different icon size is used for the surrounding entries, match that —
read the array and follow the existing style.)

- [ ] **Step 3: Render the new section**

Find the existing conditional render block (the one ending with the
`activeSection === 'shortcuts'` branch around line ~278). Add this branch
in the same chain, before the `shortcuts` branch if you want to preserve
shortcut as the visual "last" entry, or after — placement is cosmetic:

```tsx
{activeSection === 'backup' && (
    <BackupRestoreSection />
)}
```

- [ ] **Step 4: Build to verify everything compiles end-to-end**

Run: `npm.cmd run build`
Expected: clean build, no TypeScript errors. Console shows `✓ built in …`.

- [ ] **Step 5: Manual smoke test in dev**

Run: `npm.cmd run dev`
Then in the browser at the Vite dev URL:
1. Open Settings (from the existing trigger — toolbar gear icon or wherever
   `SettingsPopup` is opened).
2. Confirm "Backup & Restore" appears in the sidebar.
3. Click "Export…" → modal shows category list → Credentials unchecked,
   others checked. Click Export → a JSON file downloads with today's date in
   the filename. Open it and confirm it has `app: "openalgo-chart"`,
   `version: 1`, and the categories you selected.
4. Click "Import…" → modal opens → click "Choose file…" → pick the file you
   just exported → checkbox list appears with categories present in the
   file checked (Credentials unchecked even if present) → click Continue →
   confirmation step shows summary lines → click Replace.
5. If "Workspace" was selected, the page reloads; otherwise the modal closes
   cleanly.
6. Re-open Settings → confirm the imported state is in place.

- [ ] **Step 6: Edge-case smoke test**

1. Open Import dialog, pick a file that isn't JSON (e.g. an image) →
   error banner appears, no modal-state change, no localStorage change.
2. Open Import dialog, pick a file that's valid JSON but missing `app` →
   error banner with a clear message.
3. Open Export dialog, uncheck every category → Export button is disabled.

- [ ] **Step 7: Commit (ASK USER FIRST)**

```bash
git add src/components/Settings/SettingsPopup.tsx
git commit -m "feat(backup): wire Backup & Restore section into Settings dialog"
```

---

## Final verification

- [ ] Run the unit suite:
      `npm.cmd test -- --run src/__tests__/backupService.test.ts`
      All `backupService` tests green.
- [ ] Run the full project test suite at least once:
      `npm.cmd test -- --run`
      No new failures.
- [ ] Run a production build:
      `npm.cmd run build`
      Clean.
- [ ] Done.
