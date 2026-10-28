import { screen } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { AuthHero, marketPreviewApiKey } from '@/contexts/identity';
import { createMarketPreviewApi } from '@/contexts/identity/infra/marketPreview.api';
import { createHttpClient } from '@/shared/api/httpClient';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';

const fastPreviewApi = { [marketPreviewApiKey]: createMarketPreviewApi(createHttpClient({ sleep: () => Promise.resolve() })) };

describe('Sign-in hero', () => {
  test('Should show the public market live: last price and the best levels of the book', async () => {
    server.use(
      http.get('/markets/BTC-USD/depth', () =>
        HttpResponse.json({ buys: [{ price: '83000.00000000', quantity: '0.40000000' }], sells: [{ price: '84500.00000000', quantity: '0.10000000' }], sequence: 1, asOf: null }),
      ),
      http.get('/markets/BTC-USD/trades', () =>
        HttpResponse.json([{ tradeId: 't1', buyOrderId: 'b', sellOrderId: 's', side: 'buy', quantity: '0.01000000', price: '84000.00000000', timestamp: '2026-10-28T14:00:00.000Z' }]),
      ),
    );
    await renderWithApp(AuthHero, { provide: fastPreviewApi });

    expect(await screen.findByText('BTC-USD: Último preço 84.000,00 USD. Melhor compra 83.000,00, melhor venda 84.500,00.')).toBeTruthy();
    expect(screen.getByText(/Você define o preço\./)).toBeTruthy();
  });

  test('Should keep the headline when the market cannot be reached', async () => {
    server.use(
      http.get('/markets/BTC-USD/depth', () => HttpResponse.json({ error: 'unavailable' }, { status: 503 })),
      http.get('/markets/BTC-USD/trades', () => HttpResponse.json({ error: 'unavailable' }, { status: 503 })),
    );
    await renderWithApp(AuthHero, { provide: fastPreviewApi });

    expect(await screen.findByText('sem conexão')).toBeTruthy();
    expect(screen.getByText(/Compre e venda BTC com ordem limitada\./)).toBeTruthy();
  });
});
