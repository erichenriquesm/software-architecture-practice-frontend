import { fireEvent, screen, within } from '@testing-library/vue';
import { describe, expect, test } from 'vitest';
import { DepthChart, OrderBookPanel, RecentTrades } from '@/contexts/market';
import { marketOf } from '@/entities/market';
import { renderWithApp } from '../../support/renderWithApp';

const market = marketOf('BTC-USD')!;
const bids = [
  { price: '83000.00', quantity: '5.00000000' },
  { price: '82900.00', quantity: '12.40000000' },
];
const asks = [
  { price: '83100.00', quantity: '1.40000000' },
  { price: '83400.00', quantity: '6.10000000' },
];

describe('Order book panel', () => {
  test('Should render every level with its price and quantity, asks above the spread', async () => {
    await renderWithApp(OrderBookPanel, { props: { market, bids, asks, spread: '100.00', precision: 2 } });

    const rows = within(screen.getByRole('table', { name: 'Livro de ofertas' })).getAllByRole('row');
    const cellsOf = (row: HTMLElement) => [...row.querySelectorAll('[role="cell"], [role="columnheader"]')].map((cell) => cell.textContent?.trim()).join(' ');
    expect(rows.map(cellsOf)).toEqual([
      'Preço (USD) Quantidade (BTC)',
      '83.400,00 6,10000000',
      '83.100,00 1,40000000',
      'Spread 100,00',
      '83.000,00 5,00000000',
      '82.900,00 12,40000000',
    ]);
  });

  test('Should let the user change the price grouping', async () => {
    const { emitted } = await renderWithApp(OrderBookPanel, { props: { market, bids, asks, precision: 2 } });

    await fireEvent.update(screen.getByLabelText('Agrupar'), '-2');

    expect(emitted()['update:precision']).toEqual([[-2]]);
    expect(within(screen.getByLabelText('Agrupar')).getAllByRole('option').map((option) => option.textContent)).toEqual(['0,01', '0,1', '1', '10', '100', '1.000']);
  });

  test('Should show a skeleton while loading and an empty state for an empty book', async () => {
    const loading = await renderWithApp(OrderBookPanel, { props: { market, bids: [], asks: [], precision: 2, loading: true } });
    expect(screen.getByLabelText('Carregando livro de ofertas').getAttribute('aria-busy')).toBe('true');
    loading.unmount();

    await renderWithApp(OrderBookPanel, { props: { market, bids: [], asks: [], precision: 2 } });
    expect(screen.getByText('Livro vazio')).toBeTruthy();
  });
});

describe('Depth chart', () => {
  test('Should describe the cumulative depth for screen readers', async () => {
    await renderWithApp(DepthChart, { props: { market, bids, asks } });

    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      'Profundidade acumulada: compras até 17,40000000 BTC a partir de 83.000,00, vendas até 7,50000000 BTC a partir de 83.100,00',
    );
  });
});

describe('Recent trades', () => {
  test('Should list trades with the side in words, not only color', async () => {
    const trades = [{ tradeId: 't-1', side: 'sell', price: '83000.00', quantity: '5.00000000', timestamp: '2026-10-28T14:02:41.000Z' }];
    await renderWithApp(RecentTrades, { props: { market, trades } });

    const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell');
    expect(cells.slice(1).map((cell) => cell.textContent?.trim())).toEqual(['▼ Venda', '83.000,00', '5,00000000']);
  });
});
