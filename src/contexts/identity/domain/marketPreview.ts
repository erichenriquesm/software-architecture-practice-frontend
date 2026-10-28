import { Decimal } from 'decimal.js';

export interface PreviewLevel {
  readonly price: string;
  readonly quantity: string;
}

export interface PreviewRow extends PreviewLevel {
  /** Cumulative size from the best price up to this level, as a share of the deepest side shown: "0.00" to "100.00". */
  readonly depth: string;
}

export interface PreviewTrade {
  readonly tradeId: string;
  readonly side: 'buy' | 'sell';
  readonly price: string;
  readonly quantity: string;
}

export interface PreviewBook {
  /** Highest price first, so the best ask sits right above the last price. */
  readonly asks: readonly PreviewRow[];
  /** Highest price first: the best bid sits right below the last price. */
  readonly bids: readonly PreviewRow[];
  readonly spread?: string | undefined;
}

const byPrice = (direction: 1 | -1) => (first: PreviewLevel, second: PreviewLevel) => new Decimal(first.price).comparedTo(second.price) * direction;

const cumulative = (levels: readonly PreviewLevel[]): Decimal[] => {
  let total = new Decimal(0);
  return levels.map((level) => (total = total.plus(level.quantity)));
};

/** The few levels closest to the spread on each side, with cumulative depth bars on one scale for both sides. */
export const previewBook = (asks: readonly PreviewLevel[], bids: readonly PreviewLevel[], levels: number): PreviewBook => {
  const nearAsks = [...asks].sort(byPrice(1)).slice(0, levels);
  const nearBids = [...bids].sort(byPrice(-1)).slice(0, levels);
  const askTotals = cumulative(nearAsks);
  const bidTotals = cumulative(nearBids);
  const deepest = Decimal.max(0, askTotals.at(-1) ?? 0, bidTotals.at(-1) ?? 0);
  const share = (total: Decimal) => (deepest.isZero() ? '0.00' : total.dividedBy(deepest).times(100).toFixed(2));
  const bestAsk = nearAsks[0];
  const bestBid = nearBids[0];

  return {
    asks: nearAsks.map((level, index) => ({ ...level, depth: share(askTotals[index] ?? new Decimal(0)) })).reverse(),
    bids: nearBids.map((level, index) => ({ ...level, depth: share(bidTotals[index] ?? new Decimal(0)) })),
    spread: bestAsk && bestBid ? new Decimal(bestAsk.price).minus(bestBid.price).toFixed(2) : undefined,
  };
};
