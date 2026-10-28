import { Decimal } from 'decimal.js';
import type { DepthLevel } from './marketData';

export interface CumulativeLevel extends DepthLevel {
  readonly cumulative: string;
}

const byPrice = (direction: 1 | -1) => (first: DepthLevel, second: DepthLevel) => direction * new Decimal(first.price).comparedTo(second.price);

/** Bids best first: highest price at the top. */
export const sortBids = (bids: readonly DepthLevel[]): DepthLevel[] => [...bids].sort(byPrice(-1));

/** Asks best first: lowest price at the top. */
export const sortAsks = (asks: readonly DepthLevel[]): DepthLevel[] => [...asks].sort(byPrice(1));

export const bestBid = (bids: readonly DepthLevel[]): string | undefined => sortBids(bids)[0]?.price;

export const bestAsk = (asks: readonly DepthLevel[]): string | undefined => sortAsks(asks)[0]?.price;

export const spreadOf = (bid: string | undefined, ask: string | undefined): string | undefined => {
  if (bid === undefined || ask === undefined) return undefined;
  return new Decimal(ask).minus(bid).toFixed();
};

/** Running total of quantity from the best price outwards; levels must already be best first. */
export const cumulativeLevels = (levels: readonly DepthLevel[]): CumulativeLevel[] => {
  let total = new Decimal(0);
  return levels.map((level) => {
    total = total.plus(level.quantity);
    return { ...level, cumulative: total.toFixed() };
  });
};

/** The levels closest to the spread, best first. */
export const nearestLevels = (levels: readonly DepthLevel[], side: 'bid' | 'ask', count: number): DepthLevel[] =>
  (side === 'bid' ? sortBids(levels) : sortAsks(levels)).slice(0, count);

export interface DepthPrecision {
  readonly value: number;
  /** Width of a price bucket: 10^value. */
  readonly step: string;
}

/** The backend groups prices in buckets of 10^precision; -2 is the tick itself (no grouping). */
export const depthPrecisions: readonly DepthPrecision[] = [-2, -1, 0, 1, 2, 3].map((value) => ({ value, step: new Decimal(10).pow(value).toFixed() }));

export const defaultDepthPrecision = 2;
