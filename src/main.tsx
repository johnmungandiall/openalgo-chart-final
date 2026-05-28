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
// API key is NOT clobbered: keep an existing real key (REST/candles need it),
// otherwise seed a placeholder so the dialog stays hidden. Replace the
// placeholder with your real OpenAlgo key (http://127.0.0.1:5001/apikey) for
// history/candles. Never commit a real key. WS ticks work with any key.
if (!localStorage.getItem('oa_apikey')) {
  localStorage.setItem('oa_apikey', 'YOUR_OPENALGO_API_KEY');
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
