import { chromium } from '@playwright/test';

// Manual visual check (not part of the suite): signs in with the shared e2e account and saves screenshots.
const base = process.env.BASE_URL ?? 'http://localhost:5173';
const out = process.argv[2] ?? 'test-results/screens';

const browser = await chromium.launch();
for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]] as const) {
  const page = await browser.newPage({ viewport, colorScheme: 'dark' });
  await page.goto(`${base}/entrar`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${label}-entrar.png` });
  await page.goto(`${base}/cadastro`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${label}-cadastro.png`, fullPage: true });
  await page.goto(`${base}/entrar`);
  await page.getByLabel('E-mail').fill('e2e-buyer@example.com');
  await page.getByLabel('Senha').fill('E2eSecret1');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/mercado/);
  for (const path of ['mercado/BTC-USD', 'carteira', 'ordens']) {
    await page.goto(`${base}/${path}`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${label}-${path.split('/')[0]}.png`, fullPage: true });
  }
  const firstOrder = page.locator('a[href^="/ordens/"]').first();
  await firstOrder.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/${label}-detalhe.png`, fullPage: true });
  await page.close();
}
await browser.close();
