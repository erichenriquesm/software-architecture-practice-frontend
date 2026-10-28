import { waitFor } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { defineComponent } from 'vue';
import { useMarket } from '@/contexts/market';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';

const mountMarket = async (marketId: string) => {
  let market: ReturnType<typeof useMarket> | undefined;
  await renderWithApp(
    defineComponent({
      setup() {
        market = useMarket(marketId);
        return () => null;
      },
    }),
  );
  return market!;
};

describe('Market data', () => {
  test('Should load the summary, the grouped and exact book and the last price', async () => {
    // Given
    const precisions: Array<string | null> = [];
    server.use(
      http.get('/markets/BTC-USD', () => HttpResponse.json({ spread: '100.00', min: '81950.00', max: '83600.00', volume: '142.385', asOf: null })),
      http.get('/markets/BTC-USD/depth', ({ request }) => {
        const precision = new URL(request.url).searchParams.get('precision');
        precisions.push(precision);
        return HttpResponse.json({ buys: [{ price: '83000.00', quantity: '5' }], sells: [{ price: '83100.00', quantity: '1.4' }], sequence: 3, asOf: null });
      }),
      http.get('/markets/BTC-USD/trades', () => HttpResponse.json([{ tradeId: 't-1', buyOrderId: 'b', sellOrderId: 's', side: 'buy', price: '83050.00', quantity: '1', timestamp: '2026-10-28T14:02:41Z' }])),
    );

    // When
    const market = await mountMarket('BTC-USD');

    // Then
    await waitFor(() => expect(market.lastPrice.value).toBe('83050.00'));
    await waitFor(() => expect(market.spread.value).toBe('100'));
    expect(market.summary.value).toEqual({ spread: '100.00', min: '81950.00', max: '83600.00', volume: '142.385', asOf: undefined });
    expect(market.bestBid.value).toBe('83000.00');
    expect(new Set(precisions)).toEqual(new Set(['2', '-2']));
    expect(market.delayed.value).toBe(false);
  });

  test('Should not ask the backend about a market the app does not know', async () => {
    const market = await mountMarket('ETH-USD');

    expect(market.notFound.value).toBe(true);
  });

  test('Should flag the data as delayed when the backend is unavailable', async () => {
    server.use(
      http.get('/markets/BTC-USD', () => HttpResponse.json({ error: 'serviceUnavailable' }, { status: 503 })),
      http.get('/markets/BTC-USD/depth', () => HttpResponse.json({ buys: [], sells: [], sequence: 0, asOf: null })),
      http.get('/markets/BTC-USD/trades', () => HttpResponse.json([])),
    );

    const market = await mountMarket('BTC-USD');

    await waitFor(() => expect(market.delayed.value).toBe(true), { timeout: 4_000 });
  });
});
