import { describe, expect, test } from 'vitest';
import { previewBook } from '@/contexts/identity/domain/marketPreview';

const level = (price: string, quantity: string) => ({ price, quantity });

describe('Market preview book', () => {
  test('Should keep the levels nearest the spread, best ask lowest and best bid highest', () => {
    const book = previewBook([level('85000', '1'), level('84100', '1'), level('84500', '2')], [level('83000', '1'), level('83900', '3'), level('82000', '1')], 2);

    expect(book.asks.map((row) => row.price)).toEqual(['84500', '84100']);
    expect(book.bids.map((row) => row.price)).toEqual(['83900', '83000']);
    expect(book.spread).toBe('200.00');
  });

  test('Should draw cumulative depth on one scale for both sides', () => {
    const book = previewBook([level('84100', '1'), level('84500', '1')], [level('83900', '2'), level('83000', '2')], 5);

    expect(book.asks.map((row) => row.depth)).toEqual(['50.00', '25.00']);
    expect(book.bids.map((row) => row.depth)).toEqual(['50.00', '100.00']);
  });

  test('Should cope with an empty side', () => {
    const book = previewBook([], [level('83000', '0.4')], 5);

    expect(book.asks).toEqual([]);
    expect(book.bids).toEqual([{ price: '83000', quantity: '0.4', depth: '100.00' }]);
    expect(book.spread).toBeUndefined();
  });
});
