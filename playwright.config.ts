import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:5173';

/** Runs against the platform that is already up, through the edge (make e2e). */
export default defineConfig({
  testDir: 'e2e',
  testIgnore: ['screens/**', 'readme/**'],
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
});
