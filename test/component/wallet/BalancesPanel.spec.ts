import { fireEvent, screen } from '@testing-library/vue';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { BalancesPanel } from '@/contexts/wallet';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';
import { accountId, accountWith, fastWalletApi } from './support';

describe('Balances panel', () => {
  test('Should show skeleton rows while loading, then the available and reserved balances', async () => {
    server.use(
      http.get(`/accounts/${accountId}`, async () => {
        await delay(20);
        return HttpResponse.json(accountWith([{ assetId: 'BTC', available: '1.25000000', reserved: '0.50000000' }]));
      }),
    );
    await renderWithApp(BalancesPanel, { props: { accountId }, provide: fastWalletApi });

    expect(screen.getByRole('table', { name: 'Carregando saldos' }).getAttribute('aria-busy')).toBe('true');
    expect(await screen.findByText('1,25000000')).toBeTruthy();
    expect(screen.getByText('0,50000000')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'O que é Disponível?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'O que é Em ordens?' })).toBeTruthy();
  });

  test('Should invite a first deposit when the account has no balance', async () => {
    server.use(http.get(`/accounts/${accountId}`, () => HttpResponse.json(accountWith([]))));
    const { emitted } = await renderWithApp(BalancesPanel, { props: { accountId }, provide: fastWalletApi });

    expect(await screen.findByText('Nenhum saldo ainda')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Depositar' }));

    expect(emitted().deposit).toHaveLength(1);
  });
});
