import { screen } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { EquityCard } from '@/contexts/wallet';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';
import { accountId, accountWith, fastWalletApi } from './support';

const holdings = [
  { assetId: 'USD', available: '17600.00', reserved: '41500.00' },
  { assetId: 'BTC', available: '0.30000000', reserved: '0.20000000' },
];

const serve = (trades: readonly { price: string }[]) =>
  server.use(
    http.get(`/accounts/${accountId}`, () => HttpResponse.json(accountWith(holdings))),
    http.get('/markets/BTC-USD/trades', ({ request }) => {
      expect(new URL(request.url).searchParams.get('limit')).toBe('1');
      return HttpResponse.json(trades.map((trade, index) => ({ tradeId: `t-${index}`, buyOrderId: 'b', sellOrderId: 's', side: 'buy', quantity: '0.01000000', timestamp: '2026-10-28T14:00:00.000Z', ...trade })));
    }),
  );

describe('Equity card', () => {
  test('Should estimate the equity with BTC at the last trade price and split it by asset', async () => {
    serve([{ price: '84000.00000000' }]);
    await renderWithApp(EquityCard, { props: { accountId }, provide: fastWalletApi });

    expect(await screen.findByText('101.100,00 USD')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Distribuição: USD 58,5%, BTC 41,5%' })).toBeTruthy();
    expect(screen.getByText('estimado')).toBeTruthy();
  });

  test('Should leave BTC out and say why when nothing has traded yet', async () => {
    serve([]);
    await renderWithApp(EquityCard, { props: { accountId }, provide: fastWalletApi });

    expect(await screen.findByText('Sem negociações ainda: o BTC fica fora da estimativa até haver um preço.')).toBeTruthy();
    expect(screen.getAllByText('59.100,00 USD')).toHaveLength(2);
  });
});
