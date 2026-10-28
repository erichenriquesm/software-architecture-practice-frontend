import { Decimal } from 'decimal.js';
import { decimalPattern, normalizeTypedDecimal } from '@/entities/decimal';
import type { Market } from '@/entities/market';
import type { Side } from '@/entities/order';

/** The quick fills offered next to the quantity: a quarter, half, three quarters and all of the free balance. */
export const shares = [
  { value: '0.25', label: '25%' },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1', label: 'Máx' },
] as const;

export type Share = (typeof shares)[number]['value'];

const decimalOrUndefined = (typed: string | undefined): Decimal | undefined => {
  if (typed === undefined) return undefined;
  const normalized = normalizeTypedDecimal(typed);
  return decimalPattern.test(normalized) ? new Decimal(normalized) : undefined;
};

/**
 * The quantity that spends a share of the free balance, rounded down to the market step so it never asks for more than is free:
 * a buy spends quote (available × share ÷ price), a sell spends base (available × share).
 * Undefined when the balance is unknown, or for a buy without a positive price yet.
 */
export const quantityForShare = (market: Market, side: Side, share: string, available: string | undefined, typedPrice: string): string | undefined => {
  const free = decimalOrUndefined(available);
  if (!free) return undefined;
  const budget = free.times(share);
  const step = new Decimal(market.stepSize);
  const places = step.decimalPlaces();
  if (side === 'sell') return budget.div(step).floor().times(step).toFixed(places);
  const price = decimalOrUndefined(typedPrice);
  if (!price || price.isZero()) return undefined;
  return budget.div(price).div(step).floor().times(step).toFixed(places);
};

export interface BalanceUse {
  /** 0 to 100, for the bar width. */
  readonly percent: string;
  /** Whole percent for the label; may exceed 100. */
  readonly label: string;
  readonly exceeds: boolean;
}

/** How much of the free balance an order reserves; undefined while either side of the ratio is unknown. */
export const balanceUse = (reserved: string | undefined, available: string | undefined): BalanceUse | undefined => {
  const amount = decimalOrUndefined(reserved);
  const free = decimalOrUndefined(available);
  if (!amount || !free) return undefined;
  if (free.isZero()) return amount.isZero() ? { percent: '0', label: '0', exceeds: false } : { percent: '100', label: '100', exceeds: true };
  const ratio = amount.div(free).times(100);
  return {
    percent: Decimal.min(100, ratio).toDecimalPlaces(1).toFixed(),
    label: ratio.toDecimalPlaces(0).toFixed(),
    exceeds: ratio.greaterThan(100),
  };
};
