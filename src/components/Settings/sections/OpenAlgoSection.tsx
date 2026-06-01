/**
 * OpenAlgo Section Component
 * OpenAlgo connection settings for SettingsPopup.
 *
 * Host URL and WebSocket URL are fixed defaults (http://127.0.0.1:1100 and
 * ws://127.0.0.1:1200, seeded on every launch in main.tsx) and the OpenAlgo
 * username field was removed, so the only thing the user configures here is the
 * API key.
 */
import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from '../SettingsPopup.module.css';

export interface OpenAlgoSectionProps {
    localHostUrl: string;
    localApiKey: string;
    setLocalApiKey: (key: string) => void;
}

const OpenAlgoSection: React.FC<OpenAlgoSectionProps> = ({
    localHostUrl,
    localApiKey,
    setLocalApiKey,
}) => {
    const [showApiKey, setShowApiKey] = useState(false);

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>OPENALGO CONNECTION</h3>

            <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>API Key</label>
                <div className={styles.inputWithIcon}>
                    <input
                        type={showApiKey ? "text" : "password"}
                        value={localApiKey}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalApiKey(e.target.value)}
                        placeholder="Enter your OpenAlgo API key"
                        className={styles.input}
                    />
                    <button
                        type="button"
                        className={styles.eyeButton}
                        onClick={() => setShowApiKey(!showApiKey)}
                        title={showApiKey ? "Hide API key" : "Show API key"}
                    >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
                <p className={styles.inputHint}>
                    Find your API key in the{' '}
                    <a
                        href={`${localHostUrl}/apikey`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                    >
                        OpenAlgo Dashboard
                    </a>
                </p>
            </div>
        </div>
    );
};

export default OpenAlgoSection;
