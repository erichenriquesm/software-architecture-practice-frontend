import { chromium } from '@playwright/test';
import type { FullConfig } from '@playwright/test';

// Signs the two fixed accounts in once per run and saves their sessions: login is rate limited
// (5 per minute at the edge, 30 per hour per IP at the account service), so tests reuse these.
export const sessionFile = (role: 'buyer' | 'seller') => `e2e/.auth/${role}.json`;

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:5173';
  const browser = await chromium.launch();
  for (const role of ['buyer', 'seller'] as const) {
    const page = await browser.newPage({ baseURL });
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill(`e2e-${role}@example.com`);
    await page.getByLabel('Senha', { exact: true }).fill('E2eSecret1');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/entrar'));
    await page.context().storageState({ path: sessionFile(role) });
    await page.close();
  }
  await browser.close();
}
