/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// `base` is set to the repo name so GitHub Pages serves assets from the correct
// subpath (see TRD §10). Override with VITE_BASE if the repo name differs.
const base = process.env.VITE_BASE ?? '/DropDash/';

// Enforce the no-network guarantee (PRD §9, TRD §11) in the shipped build: a
// strict CSP with `connect-src 'none'` makes the browser physically block every
// fetch / XHR / WebSocket / beacon, so a file load *cannot* phone home even if a
// future dependency tried to. Injected only at build time so dev-server HMR
// (which needs a websocket) keeps working.
function cspPlugin(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Recharts/React set inline style attributes
    "img-src 'self' data:", // native date-picker icon is a data: URI
    "font-src 'self' data:",
    "worker-src 'self' blob:", // the CSV parsing worker
    "connect-src 'none'", // <-- the guarantee: no network egress
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return {
    name: 'dropdash-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html.replace(
          '</title>',
          `</title>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
        ),
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), cspPlugin()],
  build: {
    // Recharts is ~540 KB and is a fixed dependency (see TRD §1); it lives in its
    // own cacheable chunk, so raise the warning limit rather than flag it in CI.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split heavy vendors into their own chunks for better caching and to
        // keep the app chunk small (Recharts dominates the bundle).
        manualChunks: {
          recharts: ['recharts'],
          react: ['react', 'react-dom'],
          papaparse: ['papaparse'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
