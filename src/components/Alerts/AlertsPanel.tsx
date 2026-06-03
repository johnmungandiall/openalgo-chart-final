import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Bell, Trash2, PlayCircle, PauseCircle, Edit2, TrendingUp } from 'lucide-react';
import styles from './AlertsPanel.module.css';
import classNames from 'classnames';
import { filterAlertsBySymbol, type SymbolFilterMode } from './alertSymbolFilter';

type AlertStatus = 'Active' | 'Triggered' | 'Paused';

interface AlertCondition {
    label?: string;
}

interface Alert {
    id: string;
    symbol: string;
    exchange?: string;
    status?: AlertStatus;
    condition?: AlertCondition | string;
    name?: string;
    type?: 'indicator' | 'price';
    created_at: string | number;
}

interface AlertLog {
    id: string;
    symbol: string;
    exchange?: string;
    time: string | number;
    message: string;
}

interface NavigateInfo {
    symbol: string;
    exchange: string;
}

export interface AlertsPanelProps {
    alerts: Alert[];
    logs: AlertLog[];
    onRemoveAlert: (id: string) => void;
    onRestartAlert: (id: string) => void;
    onPauseAlert: (id: string) => void;
    onNavigate?: (info: NavigateInfo) => void;
    onEditAlert?: (alert: Alert) => void;
    /** Active chart symbol/exchange — drives the "This symbol"/"This underlying" filter */
    currentSymbol?: string;
    currentExchange?: string;
    /** Clear all alerts (Alerts tab) */
    onClearAlerts?: () => void;
    /** Clear all alert history (Log tab) */
    onClearLogs?: () => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
    alerts,
    logs,
    onRemoveAlert,
    onRestartAlert,
    onPauseAlert,
    onNavigate,
    onEditAlert,
    currentSymbol,
    currentExchange,
    onClearAlerts,
    onClearLogs
}) => {
    const [activeTab, setActiveTab] = useState<'alerts' | 'log'>('alerts');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [symbolFilter, setSymbolFilter] = useState<SymbolFilterMode>('all');
    const listRef = useRef<HTMLDivElement>(null);

    // Alerts scoped to the active chart symbol per the selected filter mode.
    const visibleAlerts = useMemo(
        () => filterAlertsBySymbol(alerts, symbolFilter, currentSymbol, currentExchange),
        [alerts, symbolFilter, currentSymbol, currentExchange]
    );

    // Reset focus when the filter changes so the index can't point past the list.
    useEffect(() => {
        setFocusedIndex(-1);
    }, [symbolFilter]);

    // Reset focusedIndex when tab changes
    useEffect(() => {
        setFocusedIndex(-1);
    }, [activeTab]);

    // Keyboard navigation handler
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>): void => {
        const items = activeTab === 'alerts' ? visibleAlerts : logs;
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => prev < 0 ? 0 : Math.min(prev + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => prev < 0 ? 0 : Math.max(prev - 1, 0));
        } else if (e.key === 'Delete' && focusedIndex >= 0 && activeTab === 'alerts') {
            e.preventDefault();
            onRemoveAlert(visibleAlerts[focusedIndex].id);
        } else if (e.key === ' ' && focusedIndex >= 0 && activeTab === 'alerts') {
            e.preventDefault();
            const alert = visibleAlerts[focusedIndex];
            if (alert.status === 'Active') onPauseAlert(alert.id);
            else onRestartAlert(alert.id);
        }
    }, [activeTab, visibleAlerts, logs, focusedIndex, onRemoveAlert, onPauseAlert, onRestartAlert]);

    // Clear the active tab (alerts or history), with a confirm prompt.
    const handleClear = useCallback((): void => {
        if (activeTab === 'alerts') {
            if (alerts.length === 0) return;
            if (window.confirm('Clear all alerts?')) onClearAlerts?.();
        } else {
            if (logs.length === 0) return;
            if (window.confirm('Clear all alert history?')) onClearLogs?.();
        }
    }, [activeTab, alerts.length, logs.length, onClearAlerts, onClearLogs]);

    // Handle click on alert row to navigate to that chart
    const handleAlertClick = useCallback((alert: Alert, e: MouseEvent<HTMLDivElement>): void => {
        // Don't navigate if clicking on action buttons
        if ((e.target as HTMLElement).closest('svg') || (e.target as HTMLElement).closest('button')) return;

        if (onNavigate && alert.symbol) {
            onNavigate({ symbol: alert.symbol, exchange: alert.exchange || 'NSE' });
        }
    }, [onNavigate]);

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <span className={styles.title}>Alerts</span>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={handleClear}
                        disabled={activeTab === 'alerts' ? alerts.length === 0 : logs.length === 0}
                        title={activeTab === 'alerts' ? 'Clear all alerts' : 'Clear alert history'}
                    >
                        <Trash2 size={14} />
                        <span>Clear</span>
                    </button>
                </div>
            </div>

            <div className={styles.tabs}>
                <div
                    className={classNames(styles.tab, { [styles.activeTab]: activeTab === 'alerts' })}
                    onClick={() => setActiveTab('alerts')}
                >
                    Alerts
                </div>
                <div
                    className={classNames(styles.tab, { [styles.activeTab]: activeTab === 'log' })}
                    onClick={() => setActiveTab('log')}
                >
                    Log
                    {logs.length > 0 && <span className={styles.logCount}>{logs.length}</span>}
                </div>
            </div>

            {activeTab === 'alerts' && (
                <div className={styles.filterBar} role="group" aria-label="Filter alerts by symbol">
                    {([
                        ['all', 'All'],
                        ['symbol', 'This symbol'],
                        ['underlying', 'This underlying'],
                    ] as [SymbolFilterMode, string][]).map(([mode, label]) => (
                        <button
                            key={mode}
                            type="button"
                            className={classNames(styles.filterBtn, { [styles.filterBtnActive]: symbolFilter === mode })}
                            onClick={() => setSymbolFilter(mode)}
                            disabled={mode !== 'all' && !currentSymbol}
                            title={mode !== 'all' && currentSymbol ? `${label}: ${currentSymbol}` : label}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <div className={styles.content}>
                {activeTab === 'alerts' ? (
                    <div
                        className={styles.list}
                        ref={listRef}
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                    >
                        {visibleAlerts.length === 0 ? (
                            <div className={styles.emptyState}>
                                {alerts.length === 0
                                    ? 'No active alerts'
                                    : `No alerts for ${currentSymbol || 'this symbol'}`}
                            </div>
                        ) : (
                            visibleAlerts.map((alert, index) => {
                                // Normalize status so we always show a readable label
                                const status = alert.status || 'Active';
                                const statusKey = status.toLowerCase();
                                const isIndicatorAlert = alert.type === 'indicator';

                                // Get alert icon based on type
                                const AlertIcon = isIndicatorAlert ? TrendingUp : Bell;

                                // Get condition description
                                const getConditionDescription = (): string => {
                                    if (isIndicatorAlert) {
                                        const condition = alert.condition as AlertCondition | undefined;
                                        return condition?.label || alert.name || 'Indicator Alert';
                                    }
                                    return (alert.condition as string) || 'Price Alert';
                                };

                                return (
                                    <div
                                        key={alert.id}
                                        className={classNames(styles.item, styles[statusKey], {
                                            [styles.focused]: index === focusedIndex,
                                            [styles.indicatorAlert]: isIndicatorAlert
                                        })}
                                        onClick={(e) => handleAlertClick(alert, e)}
                                        style={{ cursor: 'pointer' }}
                                        title="Click to view chart"
                                    >
                                        <div className={styles.itemHeader}>
                                            <div className={styles.symbolGroup}>
                                                <AlertIcon size={14} className={styles.alertTypeIcon} />
                                                <span className={styles.symbol}>
                                                    {alert.symbol}{alert.exchange ? `:${alert.exchange}` : ''}
                                                </span>
                                            </div>
                                            <span className={classNames(styles.status, styles[statusKey])}>
                                                {status}
                                            </span>
                                        </div>
                                        <div className={styles.condition}>
                                            {getConditionDescription()}
                                        </div>
                                        <div className={styles.itemFooter}>
                                            <span className={styles.time}>
                                                {new Date(alert.created_at).toLocaleDateString()} {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                            <div className={styles.itemActions}>
                                                {status === 'Active' && (
                                                    <span title="Pause Alert">
                                                        <PauseCircle
                                                            size={16}
                                                            className={styles.actionIcon}
                                                            onClick={() => onPauseAlert(alert.id)}
                                                        />
                                                    </span>
                                                )}
                                                {(status === 'Triggered' || status === 'Paused') && (
                                                    <span title="Resume Alert">
                                                        <PlayCircle
                                                            size={16}
                                                            className={styles.actionIcon}
                                                            onClick={() => onRestartAlert(alert.id)}
                                                        />
                                                    </span>
                                                )}
                                                <span title="Edit Alert">
                                                    <Edit2
                                                        size={16}
                                                        className={styles.actionIcon}
                                                        onClick={() => onEditAlert?.(alert)}
                                                    />
                                                </span>
                                                <span title="Remove Alert">
                                                    <Trash2
                                                        size={16}
                                                        className={styles.actionIcon}
                                                        onClick={() => onRemoveAlert(alert.id)}
                                                    />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div
                        className={styles.list}
                        ref={listRef}
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                    >
                        {logs.length === 0 ? (
                            <div className={styles.emptyState}>No logs</div>
                        ) : (
                            logs.map((log, index) => (
                                <div key={`${log.id}-${index}`} className={classNames(styles.logItem, {
                                    [styles.focused]: index === focusedIndex
                                })}>
                                    <div className={styles.logHeader}>
                                        <span className={styles.symbol}>
                                            {log.symbol}{log.exchange ? `:${log.exchange}` : ''}
                                        </span>
                                        <span className={styles.time}>{new Date(log.time).toLocaleTimeString()}</span>
                                    </div>
                                    <div className={styles.message}>
                                        {log.message}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertsPanel;
