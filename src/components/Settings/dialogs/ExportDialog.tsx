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
