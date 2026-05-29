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
