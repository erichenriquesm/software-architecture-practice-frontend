import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type * as VueRouter from 'vue-router';
import MarketPage from '@/pages/MarketPage.vue';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';
import { useFakeLayout } from './fitStub';

vi.mock('vue-router', async (importOriginal) => ({ ...(await importOriginal<typeof VueRouter>()), useRoute: () => ({ params: { marketId: 'BTC-USD' } }) }));

/** matchMedia as a phone (or a desktop) answers it: the page switches to tabs below 900 px. */
const asScreen = (phone: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: phone, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));

const marketData = () =>
  server.use(
    http.get('/markets/BTC-USD', () => HttpResponse.json({ spread: '100.00', min: '81950.00', max: '83600.00', volume: '142.385', asOf: null })),
    http.get('/markets/BTC-USD/depth', () => HttpResponse.json({ buys: [{ price: '83000.00', quantity: '5' }], sells: [{ price: '83100.00', quantity: '1.4' }], sequence: 3, asOf: null })),
    http.get('/markets/BTC-USD/trades', () => HttpResponse.json([{ tradeId: 't-1', buyOrderId: 'b', sellOrderId: 's', side: 'buy', price: '83050.00', quantity: '1', timestamp: '2026-10-28T14:02:41Z' }])),
  );

describe('Market page', () => {
  useFakeLayout(600);
  beforeEach(marketData);
  afterEach(() => vi.unstubAllGlobals());

  test('Should show one panel at a time behind tabs on a phone, the book first', async () => {
    asScreen(true);
    await renderWithApp(MarketPage);

    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent?.trim());
    expect(tabs).toEqual(['Livro', 'Gráfico', 'Negócios', 'Ordem']);
    expect(screen.getByRole('tab', { selected: true }).textContent?.trim()).toBe('Livro');
    expect(screen.getByRole('tabpanel', { name: 'Livro' })).toBeTruthy();
    expect(screen.queryByRole('tabpanel', { name: 'Ordem' })).toBeNull();

    await fireEvent.click(screen.getByRole('tab', { name: 'Negócios' }));
    await waitFor(() => expect(screen.getByRole('tabpanel', { name: 'Negócios' }).textContent).toContain('83.050,00'));
  });

  test('Should open the order tab with the price picked in the book on a phone', async () => {
    asScreen(true);
    await renderWithApp(MarketPage);

    await fireEvent.click(await screen.findByRole('button', { name: 'Usar o preço 83.100,00' }));

    await waitFor(() => expect(screen.getByRole('tab', { selected: true }).textContent?.trim()).toBe('Ordem'));
    expect(screen.getByRole('tabpanel', { name: 'Ordem' })).toBeTruthy();
    expect((screen.getByLabelText('Preço limite') as HTMLInputElement).value).toBe('83.100,00');
  });

  test('Should show every panel side by side, without tabs, on a desktop', async () => {
    asScreen(false);
    await renderWithApp(MarketPage);

    expect(screen.queryByRole('tablist')).toBeNull();
    await fireEvent.click(await screen.findByRole('button', { name: 'Usar o preço 83.000,00' }));
    expect((screen.getByLabelText('Preço limite') as HTMLInputElement).value).toBe('83.000,00');
    expect(screen.getByRole('heading', { name: 'Livro de ofertas' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Nova ordem limitada' })).toBeTruthy();
  });
});
