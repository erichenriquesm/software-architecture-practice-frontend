import type { Side } from '@/entities/order';

export interface MarketSummary {
  readonly spread?: string | undefined;
  readonly min?: string | undefined;
  readonly max?: string | undefined;
  readonly volume: string;
  readonly asOf?: string | undefined;
}

export interface DepthLevel {
  readonly price: string;
  readonly quantity: string;
}

export interface Depth {
  /** Highest price first. */
  readonly bids: readonly DepthLevel[];
  /** Lowest price first. */
  readonly asks: readonly DepthLevel[];
  readonly sequence: number;
  readonly asOf?: string | undefined;
}

export interface Trade {
  readonly tradeId: string;
  readonly side: Side;
  readonly price: string;
  readonly quantity: string;
  readonly timestamp: string;
}

export const emptyDepth: Depth = { bids: [], asks: [], sequence: 0 };
