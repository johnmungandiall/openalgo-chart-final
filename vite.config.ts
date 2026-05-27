import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// OpenAlgo backend lives on 5001 (REST) and 8765 (WebSocket). Override the REST
// target with OPENALGO_API_TARGET if your backend runs elsewhere.
const OPENALGO_API_TARGET = process.env.OPENALGO_API_TARGET || 'http://127.0.0.1:5001';

// Shared proxy config so dev (server) and `vite preview` behave identically.
// Routing API/WS through the proxy keeps requests same-origin, avoiding the
// browser CORS block that occurs when the page and backend differ in origin.
const proxy = {
  '/api': {
    target: OPENALGO_API_TARGET,
    changeOrigin: true,
  },
  '/ws': {
    target: 'ws://127.0.0.1:8765',
    ws: true,
  },
  '/npl-time': {
    target: 'https://www.nplindia.in',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/npl-time/, '/cgi-bin/ntp_client'),
    secure: true,
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@context': path.resolve(__dirname, './src/context'),
      '@types': path.resolve(__dirname, './src/types'),
      '@store': path.resolve(__dirname, './src/store'),
      '@constants': path.resolve(__dirname, './src/constants'),
    },
  },
  // Dev server moved off 5001 — OpenAlgo's REST API now binds that port.
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    proxy,
  },
});
