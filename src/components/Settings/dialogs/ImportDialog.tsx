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

function safeParse(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return raw; }
}

const ImportDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('picking');
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set());
  const [error, setError] = useState<string>('');

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
    if (!bundle?.categories[id]) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

export default ImportDialog;
