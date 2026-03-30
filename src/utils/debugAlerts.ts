/**
 * Debug utilities for troubleshooting alert issues
 *
 * Usage in browser console:
 * 1. Import: import { enableAlertDebug } from './utils/debugAlerts'
 * 2. Or access via window: window.debugAlerts.enable()
 */

import { globalAlertMonitor } from '../services/globalAlertMonitor';
import logger from './logger';

export interface AlertDiagnostics {
  isRunning: boolean;
  cachedAlertsCount: number;
  cachedAlerts: any[];
  hasWebSocket: boolean;
  ohlcCacheSize: number;
  lastPricesCount: number;
  rawAlertsFromStorage: any[];
  logLevel: string | null;
  isAuthenticated?: boolean;
}

/**
 * Get comprehensive diagnostics about alert monitor state
 */
export function getAlertDiagnostics(): AlertDiagnostics {
  const rawAlerts = (() => {
    try {
      return JSON.parse(localStorage.getItem('oa_alerts') || '[]');
    } catch {
      return [];
    }
  })();

  return {
    isRunning: globalAlertMonitor.isRunning(),
    cachedAlertsCount: (globalAlertMonitor as any)._cachedAlerts?.length || 0,
    cachedAlerts: (globalAlertMonitor as any)._cachedAlerts || [],
    hasWebSocket: !!(globalAlertMonitor as any)._ws,
    ohlcCacheSize: (globalAlertMonitor as any)._ohlcCache?.size || 0,
    lastPricesCount: (globalAlertMonitor as any)._lastPrices?.size || 0,
    rawAlertsFromStorage: rawAlerts,
    logLevel: localStorage.getItem('oa_log_level'),
  };
}

/**
 * Print diagnostics to console
 */
export function printAlertDiagnostics(): void {
  const diag = getAlertDiagnostics();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         ALERT MONITOR DIAGNOSTICS                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📊 Monitor Status:');
  console.log('  • Is Running:', diag.isRunning ? '✅ YES' : '❌ NO');
  console.log('  • WebSocket:', diag.hasWebSocket ? '✅ Connected' : '❌ Not connected');
  console.log('');
  console.log('🔔 Alerts:');
  console.log('  • Cached Alerts:', diag.cachedAlertsCount);
  console.log('  • Raw Alerts in Storage:', diag.rawAlertsFromStorage.length);
  console.log('');
  console.log('📈 Data:');
  console.log('  • OHLC Cache Size:', diag.ohlcCacheSize, 'symbol-intervals');
  console.log('  • Last Prices Tracked:', diag.lastPricesCount, 'symbols');
  console.log('');
  console.log('🔧 Settings:');
  console.log('  • Log Level:', diag.logLevel || 'default');
  console.log('');

  if (diag.cachedAlertsCount === 0 && diag.rawAlertsFromStorage.length > 0) {
    console.warn('⚠️  WARNING: Alerts exist in storage but not cached!');
    console.warn('   Possible reasons:');
    console.warn('   - Alerts are marked as "Triggered" or "Paused"');
    console.warn('   - Alerts are older than 24 hours');
    console.warn('   - Alert type is not "indicator"');
    console.log('');
    console.log('📋 Raw alerts:', diag.rawAlertsFromStorage);
  }

  if (!diag.isRunning) {
    console.error('❌ Monitor is NOT running!');
    console.error('   Possible reasons:');
    console.error('   - Not authenticated');
    console.error('   - No alerts to monitor');
    console.error('   - Monitor not started');
  }

  if (!diag.hasWebSocket && diag.isRunning) {
    console.error('❌ WebSocket not connected but monitor is running!');
    console.error('   This means no price updates will be received.');
  }

  console.log('');
  console.log('💡 Detailed data available in returned object');

  return diag as any;
}

/**
 * Enable debug mode (all logs)
 */
export function enableDebugMode(): void {
  localStorage.setItem('oa_log_level', '0');
  console.log('✅ Debug mode enabled. Reload page to see all logs.');
  console.log('   Run: location.reload()');
}

/**
 * Disable debug mode (warnings only)
 */
export function disableDebugMode(): void {
  localStorage.setItem('oa_log_level', '2');
  console.log('✅ Debug mode disabled. Reload page to apply.');
  console.log('   Run: location.reload()');
}

/**
 * Create a test alert for debugging
 */
export function createTestAlert(symbol = 'NIFTY', webhookUrl?: string): any {
  const testAlert = {
    id: 'test-' + Date.now(),
    symbol: symbol,
    exchange: 'NSE',
    type: 'indicator',
    indicator: 'UT Bot',
    interval: '1m',
    alert_type: 'indicator_condition',
    condition: { type: 'equals', label: 'Buy Signal' },
    frequency: 'every_time',
    message: `Test UT Bot Alert for ${symbol}`,
    webhookUrl: webhookUrl || 'https://webhook.site/test',
    status: 'Active',
    created_at: Date.now(),
  };

  try {
    const alerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');
    alerts.push(testAlert);
    localStorage.setItem('oa_alerts', JSON.stringify(alerts));

    console.log('✅ Test alert created:', testAlert);
    console.log('🔄 Refreshing monitor...');

    globalAlertMonitor.refresh();

    setTimeout(() => {
      const diag = getAlertDiagnostics();
      console.log('📊 Monitor state after refresh:');
      console.log('  • Cached alerts:', diag.cachedAlertsCount);
      console.log('  • Is running:', diag.isRunning);
    }, 500);

    return testAlert;
  } catch (error) {
    console.error('❌ Failed to create test alert:', error);
    return null;
  }
}

/**
 * Manually trigger a test alert event
 */
export function triggerTestAlert(symbol = 'NIFTY', webhookUrl?: string): void {
  const testEvent = {
    alertId: 'manual-test-' + Date.now(),
    symbol: symbol,
    exchange: 'NSE',
    alertType: 'indicator',
    indicator: 'UT Bot',
    condition: 'Buy Signal',
    conditionType: 'equals',
    timestamp: Date.now(),
    message: `Manual test alert for ${symbol}`,
    webhookUrl: webhookUrl || 'https://webhook.site/test',
    currentPrice: 22450.75,
    frequency: 'every_time',
  };

  console.log('🔔 Triggering test alert:', testEvent);

  // Access the private _onTrigger callback
  const monitor = globalAlertMonitor as any;
  if (monitor._onTrigger) {
    monitor._onTrigger(testEvent);
    console.log('✅ Test alert triggered successfully');
  } else {
    console.error('❌ No trigger callback registered!');
    console.error('   Monitor may not be started properly.');
  }
}

/**
 * Clear all alerts from storage
 */
export function clearAllAlerts(): void {
  const confirmed = confirm('⚠️  This will delete ALL alerts. Are you sure?');
  if (!confirmed) {
    console.log('❌ Cancelled');
    return;
  }

  try {
    localStorage.setItem('oa_alerts', '[]');
    localStorage.setItem('oa_chart_alerts', '{}');
    globalAlertMonitor.refresh();
    console.log('✅ All alerts cleared');
  } catch (error) {
    console.error('❌ Failed to clear alerts:', error);
  }
}

/**
 * Monitor price updates in real-time
 */
export function monitorPriceUpdates(duration = 30000): () => void {
  console.log(`📡 Monitoring price updates for ${duration / 1000} seconds...`);
  console.log('   Price updates will be logged below:');

  const monitor = globalAlertMonitor as any;
  const originalFn = monitor._onPriceUpdate;
  let updateCount = 0;

  monitor._onPriceUpdate = async function(data: any) {
    updateCount++;
    console.log(`[${updateCount}] Price update:`, {
      symbol: data.symbol,
      exchange: data.exchange,
      price: data.last,
      timestamp: new Date().toLocaleTimeString(),
    });
    return originalFn.call(this, data);
  };

  const timeout = setTimeout(() => {
    monitor._onPriceUpdate = originalFn;
    console.log(`✅ Monitoring stopped. Total updates received: ${updateCount}`);
  }, duration);

  // Return cleanup function
  return () => {
    clearTimeout(timeout);
    monitor._onPriceUpdate = originalFn;
    console.log(`🛑 Monitoring stopped manually. Total updates: ${updateCount}`);
  };
}

/**
 * Check if alerts are being filtered out
 */
export function checkAlertFiltering(): void {
  try {
    const rawAlerts = JSON.parse(localStorage.getItem('oa_alerts') || '[]');

    console.log('🔍 Checking alert filtering...');
    console.log('');
    console.log('Total alerts in storage:', rawAlerts.length);

    if (rawAlerts.length === 0) {
      console.log('❌ No alerts found in storage!');
      return;
    }

    const cutoff = Date.now() - (24 * 60 * 60 * 1000);

    rawAlerts.forEach((alert: any, index: number) => {
      console.log(`\n📋 Alert ${index + 1}:`, alert.id);
      console.log('  Symbol:', alert.symbol);
      console.log('  Type:', alert.type);
      console.log('  Status:', alert.status);
      console.log('  Indicator:', alert.indicator);
      console.log('  Created:', alert.created_at ? new Date(alert.created_at).toLocaleString() : 'N/A');

      // Check filtering conditions
      const reasons = [];

      if (alert.created_at && alert.created_at < cutoff) {
        reasons.push('❌ Too old (>24 hours)');
      }

      if (alert.status === 'Triggered') {
        reasons.push('❌ Status is "Triggered"');
      }

      if (alert.status === 'Paused') {
        reasons.push('❌ Status is "Paused"');
      }

      if (alert.type !== 'indicator') {
        reasons.push('❌ Type is not "indicator"');
      }

      if (reasons.length > 0) {
        console.log('  🚫 FILTERED OUT:');
        reasons.forEach(r => console.log('    ', r));
      } else {
        console.log('  ✅ Should be monitored');
      }
    });

    const diag = getAlertDiagnostics();
    console.log('\n📊 Summary:');
    console.log('  • Total in storage:', rawAlerts.length);
    console.log('  • Currently cached:', diag.cachedAlertsCount);
    console.log('  • Filtered out:', rawAlerts.length - diag.cachedAlertsCount);
  } catch (error) {
    console.error('❌ Error checking alerts:', error);
  }
}

// Export all functions as a single object for easy access
export const debugAlerts = {
  getDiagnostics: getAlertDiagnostics,
  print: printAlertDiagnostics,
  enableDebug: enableDebugMode,
  disableDebug: disableDebugMode,
  createTest: createTestAlert,
  triggerTest: triggerTestAlert,
  clearAll: clearAllAlerts,
  monitorPrices: monitorPriceUpdates,
  checkFiltering: checkAlertFiltering,
};

// Make available globally in development
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  (window as any).debugAlerts = debugAlerts;
  console.log('🔧 Debug utilities loaded. Access via: window.debugAlerts');
  console.log('   Available methods:', Object.keys(debugAlerts));
}

export default debugAlerts;
