import { describe, expect, test } from 'vitest';
import { changeDirection, estimateEquity, holdingSplit, inAssetOrder, interpolateDecimal, isSameAmount, quickAmounts } from '@/contexts/wallet/domain/portfolio';

const holdings = [
  { assetId: 'USD', available: '17600.00', reserved: '41500.00' },
  { assetId: 'BTC', available: '0.30000000', reserved: '0.20000000' },
];

describe('Estimated equity', () => {
  test('Should add USD and BTC at the last trade price, counting reserved funds', () => {
    expect(estimateEquity(holdings, '84000.00')).toEqual({
      totalUsd: '101100.00',
      usd: '59100.00',
      btc: '0.50000000',
      btcInUsd: '42000.00',
      totalBtc: '1.20357142',
      allocation: { usd: '58.5', btc: '41.5' },
      priced: true,
    });
  });

  test('Should keep BTC out of the total while there is no price', () => {
    const equity = estimateEquity(holdings, undefined);
    expect(equity.totalUsd).toBe('59100.00');
    expect(equity.btcInUsd).toBeUndefined();
    expect(equity.allocation).toEqual({ usd: '100.0', btc: '0.0' });
    expect(equity.priced).toBe(false);
  });

  test('Should split nothing for an empty account', () => {
    expect(estimateEquity([], '84000').allocation).toEqual({ usd: '0.0', btc: '0.0' });
  });

  test('Should make the shares sum to exactly 100 after rounding', () => {
    const { allocation } = estimateEquity([{ assetId: 'USD', available: '1', reserved: '0' }, { assetId: 'BTC', available: '1', reserved: '0' }], '2');
    expect(allocation).toEqual({ usd: '33.3', btc: '66.7' });
  });
});

describe('Holding split', () => {
  test('Should show how much is free and how much is locked in orders', () => {
    expect(holdingSplit({ assetId: 'USD', available: '17600.00', reserved: '41500.00' })).toEqual({ available: '29.78', reserved: '70.22' });
    expect(holdingSplit({ assetId: 'BTC', available: '0', reserved: '0' })).toEqual({ available: '0.00', reserved: '0.00' });
  });
});

describe('Quick amounts', () => {
  test('Should offer fixed amounts per asset for a deposit', () => {
    expect(quickAmounts('deposit', 'USD', '0').map((amount) => amount.value)).toEqual(['100', '500', '1000']);
    expect(quickAmounts('deposit', 'BTC', '0').map((amount) => amount.value)).toEqual(['0.01', '0.05', '0.1']);
  });

  test('Should add Máx with the whole available balance to a withdraw, dropping amounts above it', () => {
    expect(quickAmounts('withdraw', 'USD', '600.50')).toEqual([
      { value: '100', isMax: false },
      { value: '500', isMax: false },
      { value: '600.5', isMax: true },
    ]);
    expect(quickAmounts('withdraw', 'BTC', '0')).toEqual([]);
  });
});

describe('Counting and comparing amounts', () => {
  test('Should interpolate between two amounts without floating point drift', () => {
    expect(interpolateDecimal('0', '101100.00', 0, 2)).toBe('0.00');
    expect(interpolateDecimal('0', '101100.00', 0.5, 2)).toBe('50550.00');
    expect(interpolateDecimal('0.1', '0.3', 1, 2)).toBe('0.30');
    expect(interpolateDecimal('100', '50', 2, 2)).toBe('50.00');
  });

  test('Should tell whether a typed amount is a given one', () => {
    expect(isSameAmount('1000.00', '1000')).toBe(true);
    expect(isSameAmount('', '1000')).toBe(false);
    expect(isSameAmount('1.000', '1000')).toBe(false);
    expect(isSameAmount('abc', '1000')).toBe(false);
  });

  test('Should say which way a balance moved', () => {
    expect(changeDirection('17600.00', '17700.00')).toBe('up');
    expect(changeDirection('17600.00', '100')).toBe('down');
    expect(changeDirection('1.0', '1')).toBeUndefined();
  });
});

describe('Asset order', () => {
  test('Should list USD before BTC and unknown assets last', () => {
    const listed = inAssetOrder([{ assetId: 'ETH', available: '1', reserved: '0' }, { assetId: 'BTC', available: '1', reserved: '0' }, { assetId: 'USD', available: '1', reserved: '0' }]);
    expect(listed.map((holding) => holding.assetId)).toEqual(['USD', 'BTC', 'ETH']);
  });
});
