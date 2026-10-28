import { Decimal } from 'decimal.js';

export const decimalPattern = /^\d+(\.\d+)?$/;

export const decimalPlaces = (value: string): number => value.split('.')[1]?.length ?? 0;

/** The user types "1.234,56" or "1234.56"; the API wants "1234.56". */
export const normalizeTypedDecimal = (typed: string): string => {
  const trimmed = typed.trim().replace(/\s/g, '');
  if (trimmed.includes(',')) return trimmed.replace(/\./g, '').replace(',', '.');
  return trimmed;
};

export const isMultipleOf = (value: string, step: string): boolean => new Decimal(value).mod(step).isZero();

export const multiply = (first: string, second: string): string => new Decimal(first).times(second).toFixed();

export const isLessThan = (first: string, second: string): boolean => new Decimal(first).lessThan(second);

export const isPositive = (value: string): boolean => new Decimal(value).greaterThan(0);
