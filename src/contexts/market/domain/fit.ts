import { sortAsks, sortBids } from './depth';
import type { DepthLevel } from './marketData';

export type BookView = 'both' | 'bids' | 'asks';

export interface FittedBook {
  /** Best first. */
  readonly bids: DepthLevel[];
  /** Best first. */
  readonly asks: DepthLevel[];
}

/**
 * The levels closest to the spread that fit in `rows` rows. Both sides share the rows evenly (the odd one goes to the bids);
 * a side with fewer levels than its half gives the rest to the other side, so no row is left empty while there are levels to show.
 */
export const levelsThatFit = (bids: readonly DepthLevel[], asks: readonly DepthLevel[], rows: number, view: BookView = 'both'): FittedBook => {
  const total = Math.max(0, Math.floor(rows));
  const bidLevels = view === 'asks' ? [] : sortBids(bids);
  const askLevels = view === 'bids' ? [] : sortAsks(asks);
  const askShare = bidLevels.length === 0 ? total : Math.floor(total / 2);
  const bidCount = Math.min(bidLevels.length, total - Math.min(askLevels.length, askShare));
  const askCount = Math.min(askLevels.length, total - bidCount);
  return { bids: bidLevels.slice(0, bidCount), asks: askLevels.slice(0, askCount) };
};
