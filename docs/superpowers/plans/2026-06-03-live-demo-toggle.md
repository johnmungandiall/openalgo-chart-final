# LIVE / DEMO Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a segmented `LIVE | DEMO` toggle to the Topbar that persists the choice and reloads the app, replacing the URL-only `?demo=true` mechanism.

**Architecture:** `isDemoMode()` becomes localStorage-backed (URL `?demo=` kept as an explicit override); a new `setDemoMode()` persists the choice and reloads so every mount-time consumer (auth gate, WebSocket, charts, alert monitor) re-initialises cleanly. A self-contained `ModeToggle` leaf component in the Topbar reads `isDemoMode()`, confirms, and calls `setDemoMode()`.

**Tech Stack:** React 19 + TypeScript, Vitest + @testing-library/react (jsdom), CSS Modules.

> **⚠️ Commit policy (project rule — CLAUDE.md + user memory):** NEVER run `git add` / `git commit` / `git push` without the user explicitly asking. Treat every "Commit" step below as: stage the listed files and prepare the message, but only run git once the user says to. Otherwise, leave changes unstaged and continue.

**Spec:** `docs/superpowers/specs/2026-06-03-live-demo-toggle-design.md`

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/services/mockDataService.ts` | Mode source of truth: `isDemoMode()` (read), `setDemoMode()` (write+reload), `DEMO_MODE_KEY` |
| `src/__tests__/demoMode.test.ts` | Unit tests for the two functions |
| `src/components/Topbar/components/ModeToggle.tsx` | Segmented LIVE/DEMO view + confirm + switch |
| `src/__tests__/ModeToggle.test.tsx` | Component behaviour tests |
| `src/components/Topbar/Topbar.tsx` | Render `ModeToggle` in `rightSection` |
| `src/components/Topbar/Topbar.module.css` | Segmented toggle styles |

> Note (minor spec refinement): `ModeToggle` is imported directly into `Topbar.tsx`; we do **not** add it to `components/index.ts` (that re-export would be unused — YAGNI).

---

## Task 1: Mode source of truth (`isDemoMode` + `setDemoMode`)

**Files:**
- Modify: `src/services/mockDataService.ts` (the `isDemoMode` function near line 22)
- Test: `src/__tests__/demoMode.test.ts` (create)

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/demoMode.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isDemoMode, setDemoMode, DEMO_MODE_KEY } from '../services/mockDataService';

/** Replace window.location with a controllable stub. `search` like '' or '?demo=true'. */
function stubLocation(search: string) {
  const reload = vi.fn();
  const replace = vi.fn();
  const href = `http://localhost:5001/${search}`;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { search, href, reload, replace },
  });
  return { reload, replace };
}

describe('isDemoMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('URL ?demo=true overrides localStorage (true)', () => {
    stubLocation('?demo=true');
    (localStorage.getItem as any).mockReturnValue('false');
    expect(isDemoMode()).toBe(true);
  });

  it('URL ?demo=false overrides localStorage (false)', () => {
    stubLocation('?demo=false');
    (localStorage.getItem as any).mockReturnValue('true');
    expect(isDemoMode()).toBe(false);
  });

  it('no URL param + localStorage "true" -> true', () => {
    stubLocation('');
    (localStorage.getItem as any).mockReturnValue('true');
    expect(isDemoMode()).toBe(true);
  });

  it('no URL param + localStorage unset -> false', () => {
    stubLocation('');
    (localStorage.getItem as any).mockReturnValue(null);
    expect(isDemoMode()).toBe(false);
  });
});

describe('setDemoMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists "true" to localStorage', () => {
    stubLocation('');
    setDemoMode(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(DEMO_MODE_KEY, 'true');
  });

  it('persists "false" to localStorage', () => {
    stubLocation('');
    setDemoMode(false);
    expect(localStorage.setItem).toHaveBeenCalledWith(DEMO_MODE_KEY, 'false');
  });

  it('reloads when no ?demo param is present', () => {
    const { reload, replace } = stubLocation('');
    setDemoMode(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('clears the ?demo override and replaces the URL when present', () => {
    const { replace, reload } = stubLocation('?demo=true');
    setDemoMode(false);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    const newUrl = (replace.mock.calls[0] as unknown[])[0] as string;
    expect(newUrl).not.toContain('demo=');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/demoMode.test.ts`
Expected: FAIL — `setDemoMode` / `DEMO_MODE_KEY` are not exported yet (import error / undefined).
(If the first run prints "Vitest failed to find the current suite", just run it again — this harness shows that transiently on cold start.)

- [ ] **Step 3: Implement the change**

In `src/services/mockDataService.ts`, replace the existing `isDemoMode` function:

```ts
/**
 * Check if demo mode is enabled via URL parameter
 */
export function isDemoMode(): boolean {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('demo') === 'true';
    } catch {
        return false;
    }
}
```

with:

```ts
/** localStorage key persisting the user's LIVE/DEMO choice across reloads/restarts. */
export const DEMO_MODE_KEY = 'oc_demo_mode';

/**
 * Check if demo mode is enabled.
 * URL `?demo=true|false` is an explicit override (back-compat / deep links);
 * otherwise the persisted localStorage choice wins.
 */
export function isDemoMode(): boolean {
    try {
        const params = new URLSearchParams(window.location.search);
        const override = params.get('demo');
        if (override === 'true') return true;
        if (override === 'false') return false;
        return localStorage.getItem(DEMO_MODE_KEY) === 'true';
    } catch {
        return false;
    }
}

/**
 * Persist the LIVE/DEMO choice and reload so every mount-time `isDemoMode()`
 * consumer (auth gate, WebSocket, charts, alert monitor) re-initialises cleanly.
 */
export function setDemoMode(enabled: boolean): void {
    try {
        localStorage.setItem(DEMO_MODE_KEY, enabled ? 'true' : 'false');
        const url = new URL(window.location.href);
        const hadParam = url.searchParams.has('demo');
        url.searchParams.delete('demo');
        if (hadParam) {
            // Drop the override so the persisted choice takes effect, then reload.
            window.location.replace(url.toString());
        } else {
            window.location.reload();
        }
    } catch {
        /* no-op: localStorage / location unavailable */
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/demoMode.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit** (only if user has authorized commits — see Commit policy)

```bash
git add src/services/mockDataService.ts src/__tests__/demoMode.test.ts
git commit -m "feat: persist LIVE/DEMO mode in localStorage (isDemoMode/setDemoMode)"
```

---

## Task 2: `ModeToggle` component

**Files:**
- Create: `src/components/Topbar/components/ModeToggle.tsx`
- Test: `src/__tests__/ModeToggle.test.tsx` (create)

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/ModeToggle.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeToggle from '../components/Topbar/components/ModeToggle';
import * as modeService from '../services/mockDataService';

vi.mock('../services/mockDataService', () => ({
  isDemoMode: vi.fn(),
  setDemoMode: vi.fn(),
}));

const isDemoMode = modeService.isDemoMode as unknown as ReturnType<typeof vi.fn>;
const setDemoMode = modeService.setDemoMode as unknown as ReturnType<typeof vi.fn>;

describe('ModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks LIVE active when not in demo mode', () => {
    isDemoMode.mockReturnValue(false);
    render(<ModeToggle />);
    expect(screen.getByRole('button', { name: 'LIVE' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'DEMO' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks DEMO active when in demo mode', () => {
    isDemoMode.mockReturnValue(true);
    render(<ModeToggle />);
    expect(screen.getByRole('button', { name: 'DEMO' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches to DEMO when the inactive segment is clicked and confirmed', () => {
    isDemoMode.mockReturnValue(false);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ModeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'DEMO' }));
    expect(setDemoMode).toHaveBeenCalledWith(true);
  });

  it('does NOT switch when confirm is cancelled', () => {
    isDemoMode.mockReturnValue(false);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ModeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'DEMO' }));
    expect(setDemoMode).not.toHaveBeenCalled();
  });

  it('clicking the already-active segment is a no-op', () => {
    isDemoMode.mockReturnValue(false);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ModeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'LIVE' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(setDemoMode).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/ModeToggle.test.tsx`
Expected: FAIL — `ModeToggle` module does not exist.

- [ ] **Step 3: Implement the component**

Create `src/components/Topbar/components/ModeToggle.tsx`:

```tsx
import type { FC } from 'react';
import { isDemoMode, setDemoMode } from '../../../services/mockDataService';
import styles from '../Topbar.module.css';

/**
 * Segmented LIVE | DEMO toggle. Reads the current mode synchronously (it only
 * changes on reload) and, on switching, confirms then persists + reloads via
 * setDemoMode(). Self-contained: this is a global app-mode control, not chart state.
 */
const ModeToggle: FC = () => {
    const demo = isDemoMode();

    const switchTo = (targetDemo: boolean): void => {
        if (targetDemo === demo) return;
        const message = targetDemo
            ? 'Switch to DEMO mode? The app will reload and show simulated data.'
            : 'Switch to LIVE mode? The app will reload; you may need your API key to connect.';
        if (window.confirm(message)) {
            setDemoMode(targetDemo);
        }
    };

    return (
        <div className={styles.modeToggle} role="group" aria-label="Data mode">
            <button
                type="button"
                className={`${styles.modeSegment} ${!demo ? styles.modeSegmentActiveLive : ''}`}
                aria-pressed={!demo}
                onClick={() => switchTo(false)}
                title="Live market data"
            >
                LIVE
            </button>
            <button
                type="button"
                className={`${styles.modeSegment} ${demo ? styles.modeSegmentActiveDemo : ''}`}
                aria-pressed={demo}
                onClick={() => switchTo(true)}
                title="Simulated demo data"
            >
                DEMO
            </button>
        </div>
    );
};

export default ModeToggle;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/ModeToggle.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit** (only if user has authorized commits)

```bash
git add src/components/Topbar/components/ModeToggle.tsx src/__tests__/ModeToggle.test.tsx
git commit -m "feat: add ModeToggle segmented LIVE/DEMO control"
```

---

## Task 3: Wire `ModeToggle` into the Topbar + styles

**Files:**
- Modify: `src/components/Topbar/Topbar.tsx` (add import near line 8; render in `rightSection` near line 797)
- Modify: `src/components/Topbar/Topbar.module.css` (append styles)

- [ ] **Step 1: Add the import**

In `src/components/Topbar/Topbar.tsx`, after the `Tooltip` import (line 8):

```tsx
import Tooltip from '../Tooltip/Tooltip';
import ModeToggle from './components/ModeToggle';
```

- [ ] **Step 2: Render the toggle in the right section**

In `src/components/Topbar/Topbar.tsx`, find the start of the right section (line ~796):

```tsx
                                            {/* Right Section */}
                                            <div className={styles.rightSection}>
                                                <div className={styles.layoutSection} ref={layoutRef}>
```

Insert `ModeToggle` plus a separator as the first children of `rightSection`:

```tsx
                                            {/* Right Section */}
                                            <div className={styles.rightSection}>
                                                <ModeToggle />
                                                <div className={styles.separatorWrap}><div className={styles.separator}></div></div>
                                                <div className={styles.layoutSection} ref={layoutRef}>
```

- [ ] **Step 3: Append the styles**

Append to `src/components/Topbar/Topbar.module.css`:

```css
/* LIVE / DEMO mode toggle */
.modeToggle {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--tv-color-border);
    border-radius: 4px;
    overflow: hidden;
    height: 28px;
}

.modeSegment {
    appearance: none;
    border: none;
    background: transparent;
    cursor: pointer;
    height: 100%;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--tv-color-text-secondary);
    transition: color 0.1s, background-color 0.1s;
}

.modeSegment:hover {
    background-color: var(--tv-color-toolbar-button-background-hover);
}

.modeSegmentActiveLive {
    color: #fff;
    background-color: #089981; /* green = live */
}

.modeSegmentActiveLive:hover {
    background-color: #089981;
}

.modeSegmentActiveDemo {
    color: #fff;
    background-color: #f0a500; /* amber = demo */
}

.modeSegmentActiveDemo:hover {
    background-color: #f0a500;
}
```

- [ ] **Step 4: Verify type-check + build (no unit test — visual wiring)**

Run: `npm run type-check`
Expected: clean (no errors).

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit** (only if user has authorized commits)

```bash
git add src/components/Topbar/Topbar.tsx src/components/Topbar/Topbar.module.css
git commit -m "feat: show LIVE/DEMO toggle in Topbar"
```

---

## Task 4: Full verification

- [ ] **Step 1: Type-check**

Run: `npm run type-check`
Expected: clean.

- [ ] **Step 2: Full unit suite**

Run: `npx vitest run`
Expected: all green (existing 74 + 8 demoMode + 5 ModeToggle = 87).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Manual smoke (optional, dev)**

Run `npm run dev`, open the app, click `DEMO` in the Topbar → confirm → app reloads into demo data. Click `LIVE` → confirm → reloads to live (API-key dialog if not connected). Reopen the app and confirm the last-chosen mode persists.

---

## Self-review (completed by author)

- **Spec coverage:** localStorage source of truth + URL override (Task 1) ✓; `setDemoMode` reload semantics (Task 1) ✓; segmented Topbar control with confirm (Tasks 2–3) ✓; tests for precedence + writes + reload (Task 1) and component behaviour (Task 2) ✓; verification (Task 4) ✓.
- **Placeholder scan:** none — every code/command step is concrete.
- **Type consistency:** `DEMO_MODE_KEY`, `isDemoMode()`, `setDemoMode(enabled)` names identical across Tasks 1–2; `ModeToggle` default export imported the same way in test and Topbar.
- **Deviation noted:** `components/index.ts` is intentionally not modified (unused re-export — YAGNI), refining the spec's file list.
