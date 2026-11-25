import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const configuredApiUrl = env.VITE_API_BASE_URL;
  if (mode === 'production' && !configuredApiUrl) {
    throw new Error('VITE_API_BASE_URL must be set to the deployed Express API ending in /api.');
  }

  const apiBaseUrl = configuredApiUrl || 'http://localhost:5000/api';
  let apiUrl: URL;
  try {
    apiUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid absolute HTTP(S) URL ending in /api.');
  }
  if (!['http:', 'https:'].includes(apiUrl.protocol)
      || apiUrl.username
      || apiUrl.password
      || apiUrl.search
      || apiUrl.hash
      || apiUrl.pathname.replace(/\/$/, '') !== '/api') {
    throw new Error('VITE_API_BASE_URL must be an HTTP(S) origin with the /api path and no credentials or query.');
  }
  if (mode === 'production' && apiUrl.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use HTTPS in production.');
  }

  return {
    plugins: [
      react(),
      {
        name: 'jobfit-content-security-policy',
        transformIndexHtml(html) {
          return html
            .replace('__JOBFIT_API_ORIGIN__', apiUrl.origin)
            .replace('__JOBFIT_WS_SOURCE__', mode === 'development' ? ' ws:' : '');
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      clearMocks: true,
    },
  };
});
