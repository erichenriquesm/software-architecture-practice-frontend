import { describe, expect, test } from 'vitest';
import { normalizeTypedDecimal } from '@/entities/decimal';

describe('Typed decimals', () => {
  test.each([
    ['1.234,56', '1234.56'],
    ['1.000', '1000'],
    ['12.500.000', '12500000'],
    ['1000', '1000'],
    ['0,5', '0.5'],
    ['0.5', '0.5'],
    ['0.001', '0.001'],
    ['83000.25', '83000.25'],
    [' 1 000,00 ', '1000.00'],
  ])('Should read "%s" as %s', (typed, expected) => {
    expect(normalizeTypedDecimal(typed)).toBe(expected);
  });
});
