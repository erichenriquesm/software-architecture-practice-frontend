import { expect, test } from '@playwright/test';

// Uses the fixed account of backend/e2e (created there on its first run): signup is limited to 5 per IP per hour.
const email = 'e2e-buyer@example.com';
const password = 'E2eSecret1';

test('Should sign in, see the market, deposit, find the orders and sign out', async ({ page }) => {
  await page.goto('/carteira');
  await expect(page).toHaveURL(/\/entrar\?voltar=\/carteira/);

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Carteira' })).toBeVisible();

  const usdRow = page.getByRole('row', { name: /^USD/ });
  await expect(usdRow).toBeVisible();
  await page.getByLabel('Quantidade').fill('1,25');
  await page.getByRole('button', { name: 'Depositar USD' }).click();
  await expect(page.getByRole('status').filter({ hasText: /1,25/ })).toBeVisible();

  await page.getByRole('link', { name: 'Mercado', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Livro de ofertas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nova ordem limitada' })).toBeVisible();

  await page.getByRole('link', { name: 'Ordens', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minhas ordens' })).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar/);
  await page.goto('/carteira');
  await expect(page).toHaveURL(/\/entrar/);
});
