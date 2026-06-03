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
