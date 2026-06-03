# Design: LIVE / DEMO Mode Toggle

**Date:** 2026-06-03
**Status:** Approved (pending spec review)

## Problem

Demo mode is currently enabled only via the URL query param `?demo=true`, read
synchronously by `isDemoMode()` in `src/services/mockDataService.ts`. There is no
in-app way to switch between LIVE and DEMO data — a user must manually edit the
URL, which is not possible in the packaged Tauri desktop app. We want a visible
toggle button so users can switch between LIVE (real OpenAlgo/router data) and
DEMO (generated mock data) modes.

## Constraints / context

- `isDemoMode()` is read **synchronously at many mount points**: the auth
  render-gates in `App.tsx`, the background alert-monitor effect, `ChartComponent`
  data-source selection, and the time service. A clean switch must re-run all of
  this mount logic — so the toggle reloads the app rather than mutating state in
  place.
- The app ships as a Tauri desktop build (WebView2). `localStorage` persists
  across app restarts, so it is the correct persistence layer (URL params are not
  user-editable in the packaged app).
- Existing `?demo=true` deep-links / dev usage must keep working.

## Decisions (locked with user)

1. **Switch behavior:** persist the chosen mode in `localStorage` and **reload**
   the app on toggle. Mode survives app restarts.
2. **Button form:** a segmented `LIVE | DEMO` pill in the Topbar right section
   (next to the theme toggle); the active segment is highlighted and always shows
   current state.
3. **Confirmation:** confirm before switching ("Switch to DEMO/LIVE? The app will
   reload.") to avoid accidental reloads.

## Out of scope (YAGNI)

- Demo speed / playback controls.
- A separate demo banner or badge (the segmented control already shows state).
- Multi-symbol demo seeding or any change to mock-data generation.
- Any change to LIVE data flow.

## Design

### 1. Source of truth — `src/services/mockDataService.ts`

Make `isDemoMode()` localStorage-backed, with the URL param kept as an explicit
**override** for backwards compatibility:

```
isDemoMode():
  URL ?demo=true   -> true     (explicit override)
  URL ?demo=false  -> false    (explicit override)
  otherwise        -> localStorage[DEMO_MODE_KEY] === 'true'
  on any error     -> false
```

Add a setter:

```
setDemoMode(enabled: boolean):
  localStorage[DEMO_MODE_KEY] = enabled ? 'true' : 'false'
  remove the `demo` query param from the URL (so localStorage wins after reload)
  reload the page:
    - if the URL had a `demo` param -> location.replace(cleanUrl)  (changes URL + reloads)
    - else                          -> location.reload()
  (wrapped in try/catch; no-op on failure)
```

- `DEMO_MODE_KEY = 'oc_demo_mode'` (new constant; module-local in
  `mockDataService.ts`, matching its existing self-contained style).
- Removing the `demo` param ensures a previously-set `?demo=true` override does
  not permanently pin the mode after the user toggles via the button.

### 2. UI — `src/components/Topbar/components/ModeToggle.tsx` (new)

A self-contained leaf component (no props required; this is a global app-mode
control, not chart state):

- Reads `const demo = isDemoMode()` once at render (value only changes on reload).
- Renders a segmented pill with two segments: `LIVE` and `DEMO`. The active
  segment is highlighted (LIVE = green accent, DEMO = amber accent).
- Clicking the **inactive** segment:
  1. `window.confirm(...)` with a mode-appropriate message. The LIVE message notes
     that an API key may be required to connect.
  2. On confirm -> `setDemoMode(targetMode)` (which reloads).
  3. On cancel -> no-op.
- Clicking the already-active segment is a no-op.

Rendered in `Topbar.tsx` inside `rightSection`, before the theme toggle (one
import + one element; no new props threaded through `App.tsx`).

Styling lives in `Topbar.module.css` (new `.modeToggle`, `.modeSegment`,
`.modeSegmentActiveLive`, `.modeSegmentActiveDemo`), consistent with existing
Topbar button styling and theme variables.

### 3. Behavior / edge cases

- **DEMO -> LIVE while not authenticated:** after reload `isDemoMode()` is false,
  so the existing API-key dialog appears (unchanged behavior). The confirm text
  mentions this.
- **LIVE -> DEMO:** demo bypasses auth (existing behavior); after reload the chart
  shows mock data immediately.
- **`?demo=true` deep-link:** still forces demo (override). The first button toggle
  clears the param and switches to localStorage-backed mode.

## Testing

Unit tests (`src/__tests__/demoMode.test.ts`) with a mocked `window.location` and
`localStorage`:

- `isDemoMode()` precedence:
  - `?demo=true` -> true (even if localStorage says false)
  - `?demo=false` -> false (even if localStorage says true)
  - no param + localStorage `'true'` -> true
  - no param + localStorage unset -> false
- `setDemoMode(true)` writes `'true'` to `localStorage[DEMO_MODE_KEY]`.
- `setDemoMode(false)` writes `'false'`.
- `setDemoMode` triggers a reload (mock `location.reload` / `location.replace`).

`ModeToggle` rendering (active segment reflects `isDemoMode()`, confirm gating) is
covered by a lightweight component test if it fits the existing harness; otherwise
the logic lives in the tested service functions and the component stays a thin
view.

## Files

| File | Change |
|------|--------|
| `src/services/mockDataService.ts` | edit `isDemoMode()`, add `setDemoMode()` + `DEMO_MODE_KEY` |
| `src/components/Topbar/components/ModeToggle.tsx` | new component |
| `src/components/Topbar/components/index.ts` | export `ModeToggle` |
| `src/components/Topbar/Topbar.tsx` | import + render `ModeToggle` in `rightSection` |
| `src/components/Topbar/Topbar.module.css` | segmented toggle styles |
| `src/__tests__/demoMode.test.ts` | new unit tests |

## Verification

`npm run type-check`, `npx vitest run` (all green), `npm run build` exit 0.
