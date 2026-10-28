import { describe, expect, test } from 'vitest';
import { ageOf, isJustNow, secondsSince } from '@/contexts/market/domain/age';
import { rangePosition, sparklineOf } from '@/contexts/market/domain/sparkline';

const frame = { width: 100, height: 40, inset: 5 };

describe('Sparkline', () => {
  test('Should spread the prices on x and scale them between the insets, oldest on the left', () => {
    const spark = sparklineOf(['100.00', '110.00', '105.00'], frame);

    expect(spark.line).toBe('M0,35 L50,5 L100,20');
    expect(spark.area).toBe('M0,35 L50,5 L100,20 L100,40 L0,40 Z');
    expect(spark.end).toEqual({ x: '100', y: '20' });
    expect(spark).toMatchObject({ trend: 'up', first: '100.00', last: '105.00', change: '5', changePercent: '5.00' });
  });

  test('Should keep a flat series in the middle and report no trend', () => {
    const spark = sparklineOf(['83000.00', '83000.00'], frame);

    expect(spark.line).toBe('M0,20 L100,20');
    expect(spark).toMatchObject({ trend: 'flat', change: '0', changePercent: '0.00' });
  });

  test('Should compute the change exactly, without floating point drift', () => {
    expect(sparklineOf(['0.3', '0.1'], frame)).toMatchObject({ trend: 'down', change: '-0.2', changePercent: '-66.67' });
  });

  test('Should draw nothing with fewer than two prices', () => {
    expect(sparklineOf([], frame)).toMatchObject({ line: '', area: '', trend: 'flat' });
    expect(sparklineOf(['1'], frame)).toMatchObject({ line: '', last: '1' });
  });
});

describe('24 h range position', () => {
  test('Should place the price between the low and the high, clamped to the ends', () => {
    expect(rangePosition('50000', '84000', '67000')).toBe('50');
    expect(rangePosition('50000', '84000', '90000')).toBe('100');
    expect(rangePosition('50000', '84000', '40000')).toBe('0');
    expect(rangePosition('100', '100', '100')).toBe('50');
    expect(rangePosition(undefined, '84000', '67000')).toBeUndefined();
  });
});

describe('Ages', () => {
  const now = Date.parse('2026-10-28T14:00:00.000Z');

  test('Should count whole seconds and never go negative when the server clock runs ahead', () => {
    expect(secondsSince('2026-10-28T13:59:57.400Z', now)).toBe(2);
    expect(secondsSince('2026-10-28T14:00:03.000Z', now)).toBe(0);
    expect(secondsSince('not a date', now)).toBe(0);
  });

  test('Should call a trade younger than 5 s just now', () => {
    expect(isJustNow('2026-10-28T13:59:55.500Z', now)).toBe(true);
    expect(isJustNow('2026-10-28T13:59:55.000Z', now)).toBe(false);
  });

  test('Should express an age in the largest whole unit', () => {
    expect([ageOf(42), ageOf(60 * 7 + 5), ageOf(3_600 * 3), ageOf(86_400 * 2 + 1)]).toEqual([
      { value: 42, unit: 's' },
      { value: 7, unit: 'min' },
      { value: 3, unit: 'h' },
      { value: 2, unit: 'd' },
    ]);
  });
});
