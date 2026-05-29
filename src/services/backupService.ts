/**
 * Backup & Restore service — pure, UI-free.
 * See: docs/superpowers/specs/2026-05-29-backup-restore-design.md
 */

import {
  BUNDLE_APP_ID,
  BUNDLE_VERSION,
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

export interface ApplyResult {
  writtenKeys: string[];
  failedKeys: string[];
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
    if (!entry) continue;
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
