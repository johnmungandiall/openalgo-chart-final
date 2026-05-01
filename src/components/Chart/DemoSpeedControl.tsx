/**
 * DemoSpeedControl — Floating speed control panel for demo mode
 * Shows only when ?demo=true is active
 */
import React, { useState } from 'react';

interface DemoSpeedControlProps {
    speed: number;
    onSpeedChange: (speed: number) => void;
}

const SPEED_OPTIONS = [1, 2, 3, 5, 8, 10, 20, 50];

const DemoSpeedControl: React.FC<DemoSpeedControlProps> = ({ speed, onSpeedChange }) => {
    const [collapsed, setCollapsed] = useState(false);

    if (collapsed) {
        return (
            <div style={styles.collapsedPill} onClick={() => setCollapsed(false)} title="Demo Mode — Click to expand">
                <span style={styles.demoIcon}>⚡</span>
                <span style={styles.pillText}>{speed}x</span>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.demoIcon}>⚡</span>
                <span style={styles.title}>DEMO MODE</span>
                <button style={styles.closeBtn} onClick={() => setCollapsed(true)} title="Collapse">×</button>
            </div>
            <div style={styles.speedRow}>
                {SPEED_OPTIONS.map(s => (
                    <button
                        key={s}
                        style={{
                            ...styles.speedBtn,
                            ...(speed === s ? styles.speedBtnActive : {})
                        }}
                        onClick={() => onSpeedChange(s)}
                    >
                        {s}x
                    </button>
                ))}
            </div>
            <div style={styles.label}>
                Simulation speed: <strong>{speed}x</strong>
                <span style={styles.tickRate}> ({Math.round(800 / speed)}ms/tick)</span>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'fixed',
        bottom: 60,
        right: 16,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: 10,
        padding: '10px 14px',
        zIndex: 9999,
        boxShadow: '0 4px 20px rgba(0, 212, 255, 0.15)',
        minWidth: 210,
        fontFamily: "'Inter', -apple-system, sans-serif",
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    demoIcon: {
        fontSize: 14,
    },
    title: {
        color: '#00d4ff',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '1.5px',
        flex: 1,
    },
    closeBtn: {
        background: 'transparent',
        border: 'none',
        color: '#666',
        fontSize: 16,
        cursor: 'pointer',
        padding: '0 2px',
        lineHeight: 1,
    },
    speedRow: {
        display: 'flex',
        gap: 4,
        marginBottom: 6,
    },
    speedBtn: {
        flex: 1,
        padding: '5px 0',
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        background: 'rgba(255,255,255,0.05)',
        color: '#aaa',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    },
    speedBtnActive: {
        background: 'rgba(0, 212, 255, 0.2)',
        borderColor: '#00d4ff',
        color: '#00d4ff',
        boxShadow: '0 0 8px rgba(0, 212, 255, 0.3)',
    },
    label: {
        color: '#777',
        fontSize: 10,
        textAlign: 'center' as const,
    },
    tickRate: {
        color: '#555',
    },
    collapsedPill: {
        position: 'fixed',
        bottom: 60,
        right: 16,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: 20,
        padding: '6px 14px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0, 212, 255, 0.15)',
        transition: 'all 0.2s ease',
    },
    pillText: {
        color: '#00d4ff',
        fontSize: 12,
        fontWeight: 700,
    },
};

export default DemoSpeedControl;
