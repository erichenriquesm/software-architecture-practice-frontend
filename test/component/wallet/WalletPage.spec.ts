import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useSessionStore } from '@/contexts/identity';
import WalletPage from '@/pages/WalletPage.vue';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';
import { accountId, accountWith, fastWalletApi } from './support';

/** Makes `(max-width: 760px)` match or not, the way a phone or a desktop browser would answer. */
const emulateScreen = (phone: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: phone && query.includes('max-width: 760px'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

const renderWallet = async () => {
  server.use(
    http.get(`/accounts/${accountId}`, () => HttpResponse.json(accountWith([{ assetId: 'USD', available: '17600.00', reserved: '0.00' }]))),
    http.get('/markets/BTC-USD/trades', () => HttpResponse.json([])),
  );
  const rendered = await renderWithApp(WalletPage, { provide: fastWalletApi });
  useSessionStore(rendered.pinia).signedIn({ accountId, name: 'Ana Souza', email: 'ana@example.com' });
  await screen.findAllByText('17.600,00');
  return rendered;
};

const isShown = (element: HTMLElement | null) => element !== null && element.style.display !== 'none';

afterEach(() => vi.unstubAllGlobals());

describe('Wallet page', () => {
  test('Should show one panel at a time on a phone, switching with the Saldos / Movimentar tabs', async () => {
    emulateScreen(true);
    await renderWallet();

    const balancesTab = screen.getByRole('tab', { name: 'Saldos' });
    const movementTab = screen.getByRole('tab', { name: 'Movimentar' });
    expect(balancesTab.getAttribute('aria-selected')).toBe('true');
    expect(isShown(document.getElementById('wallet-panel-saldos'))).toBe(true);
    expect(isShown(document.getElementById('wallet-panel-movimentar'))).toBe(false);
    expect(document.getElementById('wallet-panel-movimentar')?.getAttribute('aria-labelledby')).toBe('wallet-tab-movimentar');

    await fireEvent.click(movementTab);

    expect(movementTab.getAttribute('aria-selected')).toBe('true');
    expect(isShown(document.getElementById('wallet-panel-saldos'))).toBe(false);
    expect(isShown(document.getElementById('wallet-panel-movimentar'))).toBe(true);
    expect(screen.getByRole('tabpanel', { name: 'Movimentar' }).textContent).toContain('Depositar USD');
  });

  test('Should open the Movimentar tab when the empty state asks for a deposit', async () => {
    emulateScreen(true);
    server.use(
      http.get(`/accounts/${accountId}`, () => HttpResponse.json(accountWith([]))),
      http.get('/markets/BTC-USD/trades', () => HttpResponse.json([])),
    );
    const { pinia } = await renderWithApp(WalletPage, { provide: fastWalletApi });
    useSessionStore(pinia).signedIn({ accountId, name: 'Ana Souza', email: 'ana@example.com' });

    await fireEvent.click(await screen.findByRole('button', { name: 'Depositar' }));

    expect(screen.getByRole('tab', { name: 'Movimentar' }).getAttribute('aria-selected')).toBe('true');
    await waitFor(() => expect(document.activeElement?.id).toBe('movement-quantity'));
  });

  test('Should show balances and the movement panel together on a desktop, without tabs', async () => {
    emulateScreen(false);
    await renderWallet();

    expect(screen.queryByRole('tablist', { name: 'Seção da carteira' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Saldos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Depositar USD' })).toBeTruthy();
    expect(screen.queryByRole('tabpanel', { name: 'Saldos' })).toBeNull();
  });
});
