import { Decimal } from 'decimal.js';
import { decimalPattern } from '@/entities/decimal';
import { assets } from '@/entities/market';
import type { AssetId } from '@/entities/market';
import type { MovementKind } from './movement';

export interface Holding {
  readonly assetId: string;
  readonly available: string;
  readonly reserved: string;
}

export interface Equity {
  /** Everything the account holds, priced in USD at the last trade. Without a price, only the USD part. */
  readonly totalUsd: string;
  readonly usd: string;
  readonly btc: string;
  readonly btcInUsd?: string | undefined;
  /** The same total in BTC, when there is a price. */
  readonly totalBtc?: string | undefined;
  /** Shares of the total, one decimal place, summing to 100.0 (or both 0.0 when the account is empty). */
  readonly allocation: { readonly usd: string; readonly btc: string };
  readonly priced: boolean;
}

/** Available plus reserved: everything the account holds of one asset. */
export const holdingTotalOf = (holding: Holding): string => new Decimal(holding.available).plus(holding.reserved).toFixed();

const holdingTotal = (holdings: readonly Holding[], assetId: string): Decimal => {
  const holding = holdings.find((candidate) => candidate.assetId === assetId);
  return holding ? new Decimal(holdingTotalOf(holding)) : new Decimal(0);
};

/** Estimated equity: USD plus BTC times the last trade price. It is an estimate, never what a sale would yield. */
export const estimateEquity = (holdings: readonly Holding[], lastPrice: string | undefined): Equity => {
  const usd = holdingTotal(holdings, 'USD');
  const btc = holdingTotal(holdings, 'BTC');
  const price = lastPrice === undefined ? undefined : new Decimal(lastPrice);
  const btcInUsd = price ? btc.times(price) : undefined;
  const total = btcInUsd ? usd.plus(btcInUsd) : usd;

  let usdShare = new Decimal(0);
  let btcShare = new Decimal(0);
  if (!total.isZero()) {
    btcShare = btcInUsd ? btcInUsd.dividedBy(total).times(100).toDecimalPlaces(1) : new Decimal(0);
    usdShare = new Decimal(100).minus(btcShare);
  }

  return {
    totalUsd: total.toFixed(2),
    usd: usd.toFixed(2),
    btc: btc.toFixed(8),
    btcInUsd: btcInUsd?.toFixed(2),
    totalBtc: price && !price.isZero() ? total.dividedBy(price).toFixed(8, Decimal.ROUND_DOWN) : undefined,
    allocation: { usd: usdShare.toFixed(1), btc: btcShare.toFixed(1) },
    priced: price !== undefined,
  };
};

/** How a holding splits between free to use and locked in open orders, as percentages with two decimals. */
export const holdingSplit = (holding: Holding): { readonly available: string; readonly reserved: string } => {
  const total = new Decimal(holding.available).plus(holding.reserved);
  if (total.isZero()) return { available: '0.00', reserved: '0.00' };
  const reserved = new Decimal(holding.reserved).dividedBy(total).times(100).toDecimalPlaces(2);
  return { available: new Decimal(100).minus(reserved).toFixed(2), reserved: reserved.toFixed(2) };
};

const presets: Readonly<Record<AssetId, readonly string[]>> = { USD: ['100', '500', '1000'], BTC: ['0.01', '0.05', '0.1'] };

export interface QuickAmount {
  readonly value: string;
  readonly isMax: boolean;
}

/** One-tap amounts for the movement form; a withdraw also offers the whole available balance. */
export const quickAmounts = (kind: MovementKind, assetId: AssetId, available: string): readonly QuickAmount[] => {
  const fixed = presets[assetId].map((value) => ({ value, isMax: false }));
  if (kind === 'deposit') return fixed;
  const usable = fixed.filter((amount) => !new Decimal(amount.value).greaterThan(available));
  return new Decimal(available).greaterThan(0) ? [...usable, { value: new Decimal(available).toFixed(), isMax: true }] : usable;
};

/** The value shown while a number counts from one amount to another; progress runs from 0 to 1. */
export const interpolateDecimal = (from: string, to: string, progress: number, decimals: number): string => {
  const clamped = Math.min(1, Math.max(0, progress));
  if (clamped === 1) return new Decimal(to).toFixed(decimals);
  const start = new Decimal(from);
  return start.plus(new Decimal(to).minus(start).times(clamped)).toFixed(decimals);
};

/** Whether what the user typed (already normalized) is this amount, so the matching chip can show as chosen. */
export const isSameAmount = (typed: string, value: string): boolean => decimalPattern.test(typed) && new Decimal(typed).equals(value);

/** Which way an amount moved, for the flash; undefined when it did not move. */
export const changeDirection = (previous: string, next: string): 'up' | 'down' | undefined => {
  const comparison = new Decimal(next).comparedTo(previous);
  if (comparison === 0) return undefined;
  return comparison > 0 ? 'up' : 'down';
};

/** Holdings in the order the app lists assets (USD, then BTC); unknown assets go last. */
export const inAssetOrder = <T extends Holding>(holdings: readonly T[]): readonly T[] => {
  const rank = (assetId: string) => {
    const index = assets.indexOf(assetId as AssetId);
    return index === -1 ? assets.length : index;
  };
  return [...holdings].sort((first, second) => rank(first.assetId) - rank(second.assetId));
};
