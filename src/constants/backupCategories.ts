/**
 * Source of truth for the Backup & Restore feature.
 * Maps each user-facing category to the localStorage keys it owns.
 * See: docs/superpowers/specs/2026-05-29-backup-restore-design.md
 */

import { STORAGE_KEYS } from './storageKeys';

export type CategoryId =
  | 'appearance'
  | 'intervals'
  | 'alerts'
  | 'watchlist'
  | 'drawings'
  | 'templates'
  | 'symbols'
  | 'workspace'
  | 'panels'
  | 'optionChain'
  | 'credentials';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  description: string;
  keys: string[];
  defaultChecked: boolean;
  sensitive?: boolean;
}

const WORKSPACE_STORE_KEY = 'openalgo-workspace-storage';

export const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'appearance',
    label: 'Appearance & theme',
    description: 'Theme (dark/light) and chart appearance (colours, fonts).',
    keys: [STORAGE_KEYS.THEME, STORAGE_KEYS.CHART_APPEARANCE],
    defaultChecked: true,
  },
  {
    id: 'intervals',
    label: 'Intervals & favourites',
    description: 'Current interval, favourites, and custom intervals.',
    keys: [
      STORAGE_KEYS.INTERVAL,
      STORAGE_KEYS.LAST_NONFAV_INTERVAL,
      STORAGE_KEYS.FAV_INTERVALS,
      STORAGE_KEYS.CUSTOM_INTERVALS,
    ],
    defaultChecked: true,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    description: 'Saved alerts, chart alerts, and the alert log.',
    keys: [STORAGE_KEYS.ALERTS, STORAGE_KEYS.CHART_ALERTS, STORAGE_KEYS.ALERT_LOGS],
    defaultChecked: true,
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    description: 'Watchlists and sidebar width.',
    keys: [STORAGE_KEYS.WATCHLIST, STORAGE_KEYS.WATCHLISTS, STORAGE_KEYS.WATCHLIST_WIDTH],
    defaultChecked: true,
  },
  {
    id: 'drawings',
    label: 'Drawings & tools',
    description: 'Drawing defaults, templates, favourite tools, toolbar position.',
    keys: [
      STORAGE_KEYS.DRAWING_DEFAULTS,
      STORAGE_KEYS.DRAWING_TEMPLATES,
      STORAGE_KEYS.FAVORITE_DRAWING_TOOLS,
      STORAGE_KEYS.FLOATING_TOOLBAR_POS,
    ],
    defaultChecked: true,
  },
  {
    id: 'templates',
    label: 'Chart templates & layouts',
    description: 'Saved layouts and template favourites.',
    keys: [
      STORAGE_KEYS.LAYOUT_TEMPLATES,
      STORAGE_KEYS.TEMPLATE_FAVORITES,
      STORAGE_KEYS.SAVED_LAYOUT,
    ],
    defaultChecked: true,
  },
  {
    id: 'symbols',
    label: 'Symbol history & favourites',
    description: 'Favourite symbols, recent symbols, recent commands.',
    keys: [
      STORAGE_KEYS.SYMBOL_FAVORITES,
      STORAGE_KEYS.RECENT_SYMBOLS,
      STORAGE_KEYS.RECENT_COMMANDS,
    ],
    defaultChecked: true,
  },
  {
    id: 'workspace',
    label: 'Workspace (charts, indicators, layouts)',
    description: 'Active charts, indicators, panes. Importing this reloads the page.',
    keys: [WORKSPACE_STORE_KEY],
    defaultChecked: true,
  },
  {
    id: 'panels',
    label: 'Panel state',
    description: 'Account panel size, position tracker settings.',
    keys: [
      STORAGE_KEYS.ACCOUNT_PANEL_OPEN,
      STORAGE_KEYS.ACCOUNT_PANEL_HEIGHT,
      STORAGE_KEYS.POSITION_TRACKER_SETTINGS,
    ],
    defaultChecked: true,
  },
  {
    id: 'optionChain',
    label: 'Option chain settings',
    description: 'Strike count, OI lines toggle, OI history snapshots.',
    keys: [
      STORAGE_KEYS.OPTION_CHAIN_STRIKE_COUNT,
      STORAGE_KEYS.SHOW_OI_LINES,
      STORAGE_KEYS.OI_HISTORY,
      STORAGE_KEYS.OI_CURRENT,
    ],
    defaultChecked: true,
  },
  {
    id: 'credentials',
    label: 'Credentials (API key, host URLs)',
    description: 'OpenAlgo API key, REST host, and WebSocket host. Off by default — anyone with this file can use your key.',
    keys: [
      STORAGE_KEYS.OA_API_KEY,
      STORAGE_KEYS.OA_HOST_URL,
      STORAGE_KEYS.OA_WS_URL,
      STORAGE_KEYS.OA_USERNAME,
    ],
    defaultChecked: false,
    sensitive: true,
  },
] as const;

export function getCategory(id: CategoryId): CategoryDef {
  const def = CATEGORIES.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown backup category: ${id}`);
  return def;
}

export const BUNDLE_VERSION = 1 as const;
export const BUNDLE_APP_ID = 'openalgo-chart' as const;
