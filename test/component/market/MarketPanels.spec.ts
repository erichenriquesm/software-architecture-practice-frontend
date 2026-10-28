import { fireEvent, screen, within } from '@testing-library/vue';
import { describe, expect, test } from 'vitest';
import { DepthChart, MarketHeader, OrderBookPanel, RecentTrades } from '@/contexts/market';
import { marketOf } from '@/entities/market';
import { renderWithApp } from '../../support/renderWithApp';
import { useFakeLayout } from './fitStub';

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
  useFakeLayout(600);

  const rowsOf = () => {
    const rows = within(screen.getByRole('table', { name: 'Livro de ofertas' })).getAllByRole('row');
    const cellsOf = (row: HTMLElement) => [...row.querySelectorAll('[role="cell"], [role="columnheader"]')].map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim()).join(' | ');
    return rows.map(cellsOf);
  };

  test('Should render every level with its price and quantity, asks above the last price and the spread', async () => {
    await renderWithApp(OrderBookPanel, { props: { market, bids, asks, spread: '100.00', lastPrice: '83050.00', precision: 2 } });

    expect(rowsOf()).toEqual([
      'Preço (USD) | Quantidade (BTC)',
      '83.400,00 | 6,10000000',
      '83.100,00 | 1,40000000',
      '83.050,00 último preço | spread 100,00',
      '83.000,00 | 5,00000000',
      '82.900,00 | 12,40000000',
    ]);
  });

  test('Should hand a clicked price up so the page can put it in the ticket', async () => {
    const { emitted } = await renderWithApp(OrderBookPanel, { props: { market, bids, asks, precision: 2 } });

    await fireEvent.click(screen.getByRole('button', { name: 'Usar o preço 83.100,00' }));

    expect(emitted().pick).toEqual([['83100.00']]);
  });

  test('Should show only one side of the book when asked, with the arrow keys moving between the views', async () => {
    await renderWithApp(OrderBookPanel, { props: { market, bids, asks, precision: 2 } });
    const views = screen.getByRole('radiogroup', { name: 'Lados do livro' });

    await fireEvent.click(within(views).getByRole('radio', { name: 'Só compras' }));
    expect(rowsOf().filter((row) => row.includes('83.400,00') || row.includes('83.100,00'))).toEqual([]);
    expect(rowsOf()).toContain('83.000,00 | 5,00000000');

    await fireEvent.keyDown(views, { key: 'ArrowRight' });
    expect(within(views).getByRole('radio', { name: 'Só vendas' }).getAttribute('aria-checked')).toBe('true');
    expect(rowsOf()).toContain('83.100,00 | 1,40000000');
    expect(rowsOf().some((row) => row.includes('82.900,00'))).toBe(false);
  });

  test('Should let the user change the price grouping', async () => {
    const { emitted } = await renderWithApp(OrderBookPanel, { props: { market, bids, asks, precision: 2 } });

    await fireEvent.update(screen.getByLabelText('Agrupar'), '-2');

    expect(emitted()['update:precision']).toEqual([[-2]]);
    expect(within(screen.getByLabelText('Agrupar')).getAllByRole('option').map((option) => option.textContent)).toEqual(['0,01', '0,1', '1', '10', '100', '1.000']);
  });

  test('Should show only the levels closest to the spread that fit, never a scrollbar', async () => {
    const ladder = (from: number, step: number) => Array.from({ length: 40 }, (_, index) => ({ price: (from + step * index).toFixed(2), quantity: '1.00000000' }));
    // 600 px less the column head, the last price strip and the readout (137 px) is 19 rows of 24 px: 9 asks and 10 bids
    await renderWithApp(OrderBookPanel, { props: { market, bids: ladder(83000, -10), asks: ladder(83010, 10), precision: 2 } });

    const prices = screen.getAllByRole('button', { name: /^Usar o preço/ }).map((button) => button.textContent?.trim());
    expect(prices).toHaveLength(19);
    expect(prices.slice(8, 11)).toEqual(['83.010,00', '83.000,00', '82.990,00']);
    expect(prices.at(0)).toBe('83.090,00');
    expect(prices.at(-1)).toBe('82.910,00');
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
  describe('with room for ten rows', () => {
    useFakeLayout(300);

    test('Should fill the room with the newest trades first', async () => {
      const trades = Array.from({ length: 30 }, (_, index) => ({ tradeId: `t-${index}`, side: 'buy', price: `${83000 + index}.00`, quantity: '1.00000000', timestamp: '2026-10-28T14:02:41.000Z' }));
      await renderWithApp(RecentTrades, { props: { market, trades } });

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(10);
      expect(within(rows[0]!).getAllByRole('cell')[2]?.textContent?.trim()).toBe('83.000,00');
    });
  });

  test('Should list trades with the side in words, not only color', async () => {
    const trades = [{ tradeId: 't-1', side: 'sell', price: '83000.00', quantity: '5.00000000', timestamp: '2026-10-28T14:02:41.000Z' }];
    await renderWithApp(RecentTrades, { props: { market, trades } });

    const cells = within(screen.getAllByRole('row')[1]!).getAllByRole('cell');
    expect(cells.slice(1).map((cell) => cell.textContent?.trim())).toEqual(['▼ Venda', '83.000,00', '5,00000000']);
  });

  test('Should say a trade happened just now instead of the clock time', async () => {
    const trades = [{ tradeId: 't-1', side: 'buy', price: '83000.00', quantity: '1.00000000', timestamp: new Date().toISOString() }];
    await renderWithApp(RecentTrades, { props: { market, trades } });

    expect(within(screen.getAllByRole('row')[1]!).getAllByRole('cell')[0]?.textContent?.trim()).toBe('agora');
  });
});

describe('Market header', () => {
  test('Should show the last price, the 24 h volume in the quote asset and the trend of the recent trades', async () => {
    const trades = [
      { tradeId: 't-2', side: 'buy', price: '84000.00', quantity: '0.1', timestamp: '2026-10-28T14:02:41.000Z' },
      { tradeId: 't-1', side: 'sell', price: '80000.00', quantity: '0.1', timestamp: '2026-10-28T14:01:41.000Z' },
    ];
    await renderWithApp(MarketHeader, { props: { market, lastPrice: '84000.00', trades, summary: { min: '80000.00', max: '84000.00', volume: '16400.00' } } });

    expect(screen.getByText(/Último preço 84\.000,00 USD/)).toBeTruthy();
    expect(screen.getByText('Volume 24h').nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim()).toBe('16.400,00 USD');
    expect(screen.getByText('+5,00%')).toBeTruthy();
    expect(screen.getByText('nas últimas 2 negociações')).toBeTruthy();
  });
});
