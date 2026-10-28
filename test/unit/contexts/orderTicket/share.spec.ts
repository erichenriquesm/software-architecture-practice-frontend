import { describe, expect, test } from 'vitest';
import { balanceUse, quantityForShare } from '@/contexts/orderTicket/domain/share';
import { marketOf } from '@/entities/market';

const market = marketOf('BTC-USD')!;

describe('Quantity from a share of the free balance', () => {
  test('Should spend quote on a buy, rounded down to the 0.00001 step so it never exceeds the balance', () => {
    expect(quantityForShare(market, 'buy', '0.5', '6792.50', '83.000,00')).toBe('0.04091');
    expect(quantityForShare(market, 'buy', '1', '100', '3')).toBe('33.33333');
    expect(quantityForShare(market, 'buy', '0.25', '59100.00', '83000.00')).toBe('0.17801');
  });

  test('Should spend base on a sell, whatever the price', () => {
    expect(quantityForShare(market, 'sell', '0.75', '1.25', '')).toBe('0.93750');
    expect(quantityForShare(market, 'sell', '1', '0.123456789', '')).toBe('0.12345');
  });

  test('Should not guess while the balance or the buy price is unknown', () => {
    expect(quantityForShare(market, 'buy', '0.5', undefined, '83000')).toBeUndefined();
    expect(quantityForShare(market, 'buy', '0.5', '1000', '')).toBeUndefined();
    expect(quantityForShare(market, 'buy', '0.5', '1000', '0')).toBeUndefined();
    expect(quantityForShare(market, 'buy', '0.5', '1000', 'abc')).toBeUndefined();
  });
});

describe('Share of the free balance an order reserves', () => {
  test('Should give the bar width, the label and whether it exceeds the balance', () => {
    expect(balanceUse('3396.25', '6792.50')).toEqual({ percent: '50', label: '50', exceeds: false });
    expect(balanceUse('1', '3')).toEqual({ percent: '33.3', label: '33', exceeds: false });
    expect(balanceUse('41500', '17600')).toEqual({ percent: '100', label: '236', exceeds: true });
    expect(balanceUse('1', '0')).toEqual({ percent: '100', label: '100', exceeds: true });
  });

  test('Should show nothing while either amount is unknown', () => {
    expect(balanceUse(undefined, '100')).toBeUndefined();
    expect(balanceUse('10', undefined)).toBeUndefined();
  });
});
