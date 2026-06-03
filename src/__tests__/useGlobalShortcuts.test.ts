import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';

/**
 * Regression coverage for the "uppercase T won't type" bug.
 *
 * The `addOrder` shortcut is bound to Shift+T. Typing a capital letter in any
 * text field is physically Shift+<letter>, which must NOT be treated as a
 * command chord — otherwise the global handler preventDefault()s the keystroke
 * and the character never reaches the input.
 */

let unmountHook: (() => void) | null = null;

afterEach(() => {
  unmountHook?.();
  unmountHook = null;
  document.body.replaceChildren();
});

function mount(handlers: Record<string, (p?: unknown) => void>, options = {}) {
  const { unmount } = renderHook(() => useGlobalShortcuts(handlers, { enabled: true, ...options }));
  unmountHook = unmount;
}

function dispatchKey(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('useGlobalShortcuts — typing vs Shift shortcuts', () => {
  it('does NOT swallow uppercase letters (Shift+T) while typing in an input', () => {
    const addOrder = vi.fn();
    mount({ addOrder });

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = dispatchKey(input, { key: 'T', shiftKey: true });

    expect(addOrder).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('does NOT swallow uppercase letters while typing in a textarea', () => {
    const addOrder = vi.fn();
    mount({ addOrder });

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const event = dispatchKey(textarea, { key: 'T', shiftKey: true });

    expect(addOrder).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('lets lowercase t type normally in an input (control)', () => {
    const addOrder = vi.fn();
    mount({ addOrder });

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = dispatchKey(input, { key: 't', shiftKey: false });

    expect(addOrder).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('STILL fires Shift+T (addOrder) when NOT typing in a field', () => {
    const addOrder = vi.fn();
    mount({ addOrder });

    const event = dispatchKey(document.body, { key: 'T', shiftKey: true });

    expect(addOrder).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
