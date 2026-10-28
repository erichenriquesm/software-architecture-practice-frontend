import { chromium } from '@playwright/test';

// Manual visual check (not part of the suite): signs in with the shared e2e account and saves screenshots.
const base = process.env.BASE_URL ?? 'http://localhost:5173';
const out = process.argv[2] ?? 'test-results/screens';

const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]] as const) {
  const page = await browser.newPage({ viewport, colorScheme: 'dark' });
  await page.goto(`${base}/entrar`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${label}-entrar.png` });
  await page.getByLabel('E-mail').focus();
  await page.keyboard.type('ana@exemplo.com');
  await page.getByLabel('Senha', { exact: true }).focus();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${label}-entrar-foco.png` });
  await page.goto(`${base}/entrar?motivo=sessao`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${label}-entrar-sessao.png` });
  await page.goto(`${base}/cadastro`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${label}-cadastro.png`, fullPage: true });
  await page.goto(`${base}/entrar`);
  await page.getByLabel('E-mail').fill('e2e-buyer@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('E2eSecret1');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/mercado/);
  for (const path of ['mercado/BTC-USD', 'carteira', 'ordens']) {
    await page.goto(`${base}/${path}`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${label}-${path.split('/')[0]}.png`, fullPage: true });
  }
  await page.goto(`${base}/carteira`);
  await page.waitForTimeout(1500);
  const amount = page.getByLabel('Quantidade', { exact: true });
  if (await amount.isVisible()) {
    await amount.focus();
    await page.keyboard.type('12,5');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${label}-carteira-foco.png` });
  }
  await page.goto(`${base}/mercado/BTC-USD`);
  await page.waitForTimeout(2000);
  const price = page.getByLabel('Preço limite', { exact: true });
  if (await price.isVisible()) {
    await price.focus();
    await page.keyboard.press('Tab');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${label}-mercado-foco.png` });
  }
  await page.goto(`${base}/ordens`);
  await page.waitForTimeout(2000);
  const cancel = page.getByRole('button', { name: /^Cancelar ordem de/ }).first();
  if (await cancel.isVisible()) {
    await cancel.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${label}-ordens-confirmar.png` });
    await page.keyboard.press('Escape');
  }
  await page.getByRole('row').nth(2).hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${label}-ordens-hover.png` });
  const firstOrder = page.locator('a[href^="/ordens/"]').first();
  await firstOrder.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/${label}-detalhe.png`, fullPage: true });
  await page.close();
}
await browser.close();
