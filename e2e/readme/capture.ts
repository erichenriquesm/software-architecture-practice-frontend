import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';

// Screenshots and a walkthrough video for the umbrella README (make readme-media). Reuses the e2e buyer session.
const base = 'http://localhost:5173';
const out = process.argv[2] ?? 'media';
const session = 'e2e/.auth/buyer.json';
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const settle = (page: Page, ms = 2500) => page.waitForTimeout(ms);

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: session, colorScheme: 'dark' });
const page = await desktop.newPage();
for (const [path, name] of [['/mercado/BTC-USD', 'mercado'], ['/carteira', 'carteira'], ['/ordens', 'ordens']] as const) {
  await page.goto(`${base}${path}`);
  await settle(page);
  if (name === 'mercado') {
    const level = page.locator('.lt-book-row').nth(1);
    if (await level.count()) await level.hover();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${out}/${name}.png` });
}
const row = page.locator('a[href^="/ordens/"]').first();
if (await row.count()) {
  await row.click();
  await settle(page, 2000);
  await page.screenshot({ path: `${out}/detalhe.png` });
}
await desktop.close();

const guest = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const login = await guest.newPage();
await login.goto(`${base}/entrar`);
await settle(login);
await login.screenshot({ path: `${out}/entrar.png` });
await guest.close();

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: session, colorScheme: 'dark' });
const mobile = await phone.newPage();
await mobile.goto(`${base}/mercado/BTC-USD`);
await settle(mobile);
await mobile.screenshot({ path: `${out}/celular-mercado.png` });
const orderTab = mobile.getByRole('tab', { name: 'Ordem', exact: true });
if (await orderTab.count()) {
  await orderTab.click();
  await settle(mobile, 800);
  await mobile.screenshot({ path: `${out}/celular-boleta.png` });
}
await phone.close();

const video = await browser.newContext({ viewport: { width: 1280, height: 800 }, storageState: session, colorScheme: 'dark', recordVideo: { dir: `${out}/video`, size: { width: 1280, height: 800 } } });
const tour = await video.newPage();
await tour.goto(`${base}/mercado/BTC-USD`);
await settle(tour, 3000);
const levels = tour.locator('.lt-book-row');
for (let index = 0; index < Math.min(await levels.count(), 3); index += 1) {
  await levels.nth(index).hover();
  await tour.waitForTimeout(700);
}
const pick = tour.locator('.lt-book-pick').first();
if (await pick.count()) {
  await pick.click();
  await tour.waitForTimeout(900);
}
const chip = tour.getByRole('button', { name: /^25/ }).first();
if (await chip.count()) {
  await chip.click();
  await tour.waitForTimeout(1200);
}
const help = tour.getByRole('button', { name: 'O que é Preço limite?' });
if (await help.count()) {
  await help.hover();
  await tour.waitForTimeout(1800);
  await tour.mouse.move(10, 400);
}
await tour.getByRole('link', { name: 'Carteira', exact: true }).click();
await settle(tour, 2500);
await tour.getByRole('link', { name: 'Ordens', exact: true }).click();
await settle(tour, 2000);
await tour.locator('a[href^="/ordens/"]').first().hover();
await tour.waitForTimeout(700);
await tour.locator('a[href^="/ordens/"]').first().click();
await settle(tour, 2500);
await video.close();
await browser.close();
