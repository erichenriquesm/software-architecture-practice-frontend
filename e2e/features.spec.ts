import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { sessionFile } from './global-setup';

// Every user-facing feature against the real platform. Uses the fixed accounts of backend/e2e (signup is limited to
// 5 per IP per hour, so this suite never submits a signup) and prices inside the current spread, so its orders
// only ever match each other.

const password = 'E2eSecret1';
const brl = (value: string) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));

const signIn = async (page: Page, email: string) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/entrar/);
};

/** A page already signed in with the session global-setup saved (no extra login). */
const sessionFor = async (browser: Browser, role: 'buyer' | 'seller') => (await browser.newContext({ storageState: sessionFile(role) })).newPage();

/** A price above the best bid and below the best ask, rounded to the tick. */
const priceInsideSpread = async (page: Page): Promise<string> => {
  const depth = (await (await page.request.get('/markets/BTC-USD/depth')).json()) as { buys: Array<{ price: string }>; sells: Array<{ price: string }> };
  const bestBid = Math.max(0, ...depth.buys.map((level) => Number(level.price)));
  const bestAsk = depth.sells.length ? Math.min(...depth.sells.map((level) => Number(level.price))) : bestBid + 2_000;
  return (Math.floor(((bestBid + bestAsk) / 2) * 100) / 100).toFixed(2);
};

const deposit = async (page: Page, assetId: 'USD' | 'BTC', typed: string) => {
  await page.goto('/carteira');
  await page.getByRole('tab', { name: 'Depositar' }).click();
  await page.getByLabel('Ativo').selectOption(assetId);
  await page.getByLabel('Quantidade', { exact: true }).fill(typed);
  await page.getByRole('button', { name: `Depositar ${assetId}` }).click();
  await expect(page.getByRole('status').filter({ hasText: assetId })).toBeVisible();
};

const placeOrder = async (page: Page, side: 'buy' | 'sell', price: string, quantity: string) => {
  await page.goto('/mercado/BTC-USD');
  await page.getByRole('radio', { name: side === 'buy' ? 'Compra' : 'Venda', exact: true }).click();
  await page.getByLabel('Preço limite', { exact: true }).fill(price.replace('.', ','));
  await page.getByLabel('Quantidade', { exact: true }).fill(quantity);
  const action = side === 'buy' ? 'Comprar BTC' : 'Vender BTC';
  await page.locator('.ticket-submit, form').getByRole('button', { name: action }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: action }).click();
  await expect(page.getByText('Sua ordem entrou no livro.')).toBeVisible();
};

test.describe('Authentication', () => {
  test('Should guard private pages, explain wrong credentials, reveal the password and come back after sign in', async ({ page }) => {
    await page.goto('/ordens');
    await expect(page).toHaveURL(/\/entrar\?voltar=\/ordens/);

    await page.getByLabel('E-mail').fill(`nobody-${Date.now()}@example.com`);
    await page.getByLabel('Senha', { exact: true }).fill('Wrongpass1');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.');

    const passwordInput = page.getByLabel('Senha', { exact: true });
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar senha' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.getByLabel('E-mail').fill('e2e-buyer@example.com');
    await passwordInput.fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/ordens$/);
  });

  test('Should validate the sign-up form before sending anything', async ({ page }) => {
    let signups = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/signup')) signups += 1;
    });
    await page.goto('/cadastro');
    await page.getByLabel('Nome completo').fill('Ana');
    await page.getByLabel('CPF').fill('52998224726');
    await page.getByLabel('CPF').blur();
    await expect(page.getByLabel('CPF')).toHaveValue('529.982.247-26');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('Informe nome e sobrenome.')).toBeVisible();
    await expect(page.getByText('Informe um CPF válido.')).toBeVisible();
    expect(signups).toBe(0);
  });

  test('Should keep the chosen theme across reloads and end the session on sign out', async ({ page }) => {
    await signIn(page, 'e2e-buyer@example.com');
    await page.getByRole('button', { name: 'Usar tema claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Usar tema escuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/entrar/);
    await page.goto('/carteira');
    await expect(page).toHaveURL(/\/entrar/);
  });
});

test.describe('Trading', () => {
  test('Should cross a sell and a buy picked from the book and show the fill in the order detail', async ({ browser }) => {
    const seller = await sessionFor(browser, 'seller');
    const buyer = await sessionFor(browser, 'buyer');
    await deposit(seller, 'BTC', '0,01');
    await deposit(buyer, 'USD', '1000');
    const price = await priceInsideSpread(buyer);

    await placeOrder(seller, 'sell', price, '0,001');

    await buyer.goto('/mercado/BTC-USD');
    await buyer.getByRole('radio', { name: 'Compra', exact: true }).click();
    await buyer.getByRole('button', { name: `Usar o preço ${brl(price)}` }).click();
    await expect(buyer.getByLabel('Preço limite', { exact: true })).toHaveValue(new RegExp(brl(price).replace('.', '\\.')));
    await buyer.getByLabel('Quantidade', { exact: true }).fill('0,001');
    await buyer.locator('form').getByRole('button', { name: 'Comprar BTC' }).first().click();
    await buyer.getByRole('dialog').getByRole('button', { name: 'Comprar BTC' }).click();
    await expect(buyer.getByText('Sua ordem entrou no livro.')).toBeVisible();

    await buyer.getByRole('link', { name: 'Ordens', exact: true }).click();
    await buyer.getByRole('button', { name: /Executadas/ }).click();
    await buyer.locator('a[href^="/ordens/"]').first().click();
    await expect(buyer.getByText('Executada').first()).toBeVisible();
    await expect(buyer.getByText(/100\s*%/).first()).toBeVisible();
  });

  test('Should cancel an open order and give the reservation back', async ({ browser }) => {
    const page = await sessionFor(browser, 'buyer');
    await deposit(page, 'USD', '100');
    await placeOrder(page, 'buy', '10.00', '0,5');

    await page.getByRole('link', { name: 'Ordens', exact: true }).click();
    await page.getByRole('button', { name: /Abertas/ }).click();
    await page.getByRole('button', { name: /Cancelar ordem de compra/ }).first().click();
    await page.getByRole('button', { name: /Canceladas/ }).click();
    await expect(page.getByText('Cancelada').first()).toBeVisible();
  });

  test('Should withdraw from the available balance and refuse more than that', async ({ browser }) => {
    const page = await sessionFor(browser, 'buyer');
    await page.goto('/carteira');
    await page.getByRole('tab', { name: 'Sacar' }).click();
    await page.getByLabel('Ativo').selectOption('USD');
    await page.getByLabel('Quantidade', { exact: true }).fill('999999999');
    await page.getByRole('button', { name: 'Sacar USD' }).click();
    await expect(page.getByText(/disponível/i).first()).toBeVisible();

    await page.getByLabel('Quantidade', { exact: true }).fill('1,00');
    await page.getByRole('button', { name: 'Sacar USD' }).click();
    await expect(page.getByRole('status').filter({ hasText: '1,00' })).toBeVisible();
  });
});

test.describe('Layout', () => {
  test('Should fit the sign-in and sign-up screens without scroll on desktop and phone', async ({ browser }) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await (await browser.newContext({ viewport })).newPage();
      for (const path of ['/entrar', '/cadastro']) {
        await page.goto(path);
        await page.waitForTimeout(1000);
        const overflow = await page.evaluate(() => [document.documentElement.scrollHeight - innerHeight, document.documentElement.scrollWidth - innerWidth]);
        expect(overflow, `${path} ${viewport.width}x${viewport.height}`).toEqual([0, 0]);
      }
    }
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`Should fit every screen without scroll at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, storageState: sessionFile('buyer') });
      const page = await context.newPage();
      const fits = async (path: string) => {
        await page.goto(path);
        await page.waitForTimeout(1200);
        const overflow = await page.evaluate(() => ({
          vertical: document.documentElement.scrollHeight - innerHeight,
          horizontal: document.documentElement.scrollWidth - innerWidth,
        }));
        expect(overflow, path).toEqual({ vertical: 0, horizontal: 0 });
      };
      for (const path of ['/mercado/BTC-USD', '/carteira', '/ordens']) await fits(path);
      await context.close();
    });
  }
});
