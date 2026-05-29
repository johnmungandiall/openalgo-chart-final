/**
 * Resolves a stable device identifier.
 *
 * In the packaged Tauri app this calls the `get_device_id` Rust command, which
 * reads the Windows MachineGuid — stable across reinstalls and hard to fake.
 * Outside Tauri (dev in a browser) it falls back to a UUID persisted in
 * localStorage so the trial/license flow still works during development.
 */
import { DEVICE_ID_STORAGE } from './config';

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  // Try the Tauri command first.
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const id = await invoke<string>('get_device_id');
    if (id && id.trim()) {
      cached = id.trim();
      return cached;
    }
  } catch {
    // Not running inside Tauri, or the command failed — use the fallback.
  }

  // Fallback: persisted UUID (dev/browser only).
  let id = localStorage.getItem(DEVICE_ID_STORAGE);
  if (!id) {
    id =
      'web-' +
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(DEVICE_ID_STORAGE, id);
  }
  cached = id;
  return id;
}
