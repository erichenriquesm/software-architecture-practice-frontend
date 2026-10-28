import { Decimal } from 'decimal.js';

export const decimalPattern = /^\d+(\.\d+)?$/;

export const decimalPlaces = (value: string): number => value.split('.')[1]?.length ?? 0;

/** Brazilian thousands grouping without a comma: "1.000", "12.500.000" (a leading zero means a decimal, as in "0.001"). */
const thousandsOnly = /^[1-9]\d{0,2}(\.\d{3})+$/;

/** The user types "1.234,56", "1.000" or "0.5"; the API wants "1234.56", "1000" and "0.5". */
export const normalizeTypedDecimal = (typed: string): string => {
  const trimmed = typed.trim().replace(/\s/g, '');
  if (trimmed.includes(',')) return trimmed.replace(/\./g, '').replace(',', '.');
  if (thousandsOnly.test(trimmed)) return trimmed.replace(/\./g, '');
  return trimmed;
};

export const isMultipleOf = (value: string, step: string): boolean => new Decimal(value).mod(step).isZero();

export const multiply = (first: string, second: string): string => new Decimal(first).times(second).toFixed();

export const isLessThan = (first: string, second: string): boolean => new Decimal(first).lessThan(second);

export const isPositive = (value: string): boolean => new Decimal(value).greaterThan(0);
