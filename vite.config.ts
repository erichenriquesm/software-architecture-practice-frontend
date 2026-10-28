import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

/** API routes of the edge; the dev server forwards them so the browser sees one origin (the cookie is SameSite=Strict). */
const apiRoutes = '^/(signup|login|logout|me|deposit|withdraw|place_order|cancel_order)$|^/(accounts|orders|markets)/';
const edge = process.env.EDGE_URL ?? 'http://edge';

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    strictPort: true,
    // Dev has no CSP (HMR injects inline scripts); the production nginx sets the full policy
    headers: { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' },
    // Exact match: a prefix like /me would also catch the /mercado page
    proxy: { [apiRoutes]: { target: edge, changeOrigin: false, xfwd: true } },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['test/support/setup.ts'],
    restoreMocks: true,
  },
});
