import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { UIProvider } from './context/UIContext';
import { ToolProvider } from './context/ToolContext';
import { AlertProvider } from './context/AlertContext';
import { WatchlistProvider } from './context/WatchlistContext';

// Apply theme immediately to prevent flash of default theme
// This runs synchronously BEFORE React renders anything
const savedTheme = localStorage.getItem('tv_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// --- Quantonomous Router connection (force, no connect prompt) ---
// The Quantonomous Engine hosts an OpenAlgo-compatible gateway: REST on 1100,
// WS on 1200 (same wire contract — see OPENALGO-API-CONTRACT.md). Seeding these
// before React mounts means the API-key dialog never appears and the chart
// connects directly to the router instead of OpenAlgo on :5001 / :8765.
// Host + WS are forced on every load so a stale :5001 value can't win.
localStorage.setItem('oa_host_url', 'http://127.0.0.1:1100');
localStorage.setItem('oa_ws_url', 'ws://127.0.0.1:1200');
// API key: REST (/history, /chart) on :1100 needs your REAL OpenAlgo key, so a
// fake placeholder would 403 and leave the chart with no candles. Seed the key
// from an untracked env var (VITE_OPENALGO_API_KEY in .env.local) when present —
// never hardcode a real broker key in committed source. If no env key is set
// and none is already saved, oa_apikey stays empty so the connect dialog appears
// and the user can enter their key once (it then persists in localStorage).
const OLD_PLACEHOLDER_KEY = 'YOUR_OPENALGO_API_KEY';
const seededApiKey = import.meta.env.VITE_OPENALGO_API_KEY;
if (seededApiKey) {
  localStorage.setItem('oa_apikey', seededApiKey);
} else if (localStorage.getItem('oa_apikey') === OLD_PLACEHOLDER_KEY) {
  // Remove the harmful placeholder left by earlier builds so the connect
  // dialog can appear instead of silently 403-ing every REST call.
  localStorage.removeItem('oa_apikey');
}
// -----------------------------------------------------------------

// Suppress known browser extension errors that pollute the console
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  // Chrome Extension Messaging API error
  // Occurs when an extension content script throws an error or fails to handle a message
  if (event.reason && (event.reason as Error).message &&
    (event.reason as Error).message.includes('message channel closed before a response was received')) {
    event.preventDefault(); // Stop the error from being printed to console
    console.debug('[External] Suppressed browser extension error:', (event.reason as Error).message);
  }
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <UserProvider>
          <ThemeProvider>
            <UIProvider>
              <ToolProvider>
                <AlertProvider>
                  <WatchlistProvider>
                    <App />
                  </WatchlistProvider>
                </AlertProvider>
              </ToolProvider>
            </UIProvider>
          </ThemeProvider>
        </UserProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
