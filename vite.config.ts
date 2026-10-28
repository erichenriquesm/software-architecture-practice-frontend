import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    strictPort: true,
    // The browser reaches the dev server through the edge on 127.0.0.1:8080, so HMR goes there too
    hmr: { clientPort: 8080 },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['test/support/setup.ts'],
    restoreMocks: true,
  },
});
