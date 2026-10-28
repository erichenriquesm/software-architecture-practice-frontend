import { describe, expect, test } from 'vitest';
import { levelsThatFit } from '@/contexts/market/domain/fit';

const ladder = (from: number, step: number, count: number) => Array.from({ length: count }, (_, index) => ({ price: (from + step * index).toFixed(2), quantity: '1' }));
const pricesOf = (levels: ReadonlyArray<{ price: string }>) => levels.map((level) => level.price);

describe('Order book levels that fit', () => {
  const bids = ladder(83000, -10, 30).reverse();
  const asks = ladder(83010, 10, 30).reverse();

  test('Should split the rows between both sides, keeping the levels closest to the spread', () => {
    const fitted = levelsThatFit(bids, asks, 6);

    expect(pricesOf(fitted.bids)).toEqual(['83000.00', '82990.00', '82980.00']);
    expect(pricesOf(fitted.asks)).toEqual(['83010.00', '83020.00', '83030.00']);
  });

  test('Should give the odd row to the bids', () => {
    const fitted = levelsThatFit(bids, asks, 7);

    expect([fitted.asks.length, fitted.bids.length]).toEqual([3, 4]);
  });

  test('Should hand the rows a short side does not need to the other side', () => {
    expect(levelsThatFit(bids, ladder(83010, 10, 2), 10).bids).toHaveLength(8);
    expect(levelsThatFit(ladder(83000, -10, 1), asks, 10).asks).toHaveLength(9);
  });

  test('Should give every row to the one side the user chose to see', () => {
    expect(levelsThatFit(bids, asks, 12, 'bids')).toEqual({ bids: levelsThatFit(bids, [], 12).bids, asks: [] });
    expect(pricesOf(levelsThatFit(bids, asks, 3, 'asks').asks)).toEqual(['83010.00', '83020.00', '83030.00']);
    expect(levelsThatFit(bids, asks, 3, 'asks').bids).toEqual([]);
  });

  test('Should show nothing when no row fits and everything when the book is shorter than the space', () => {
    expect(levelsThatFit(bids, asks, 0)).toEqual({ bids: [], asks: [] });
    const short = levelsThatFit(bids.slice(0, 2), asks.slice(0, 2), 40);
    expect([short.bids.length, short.asks.length]).toEqual([2, 2]);
  });
});
