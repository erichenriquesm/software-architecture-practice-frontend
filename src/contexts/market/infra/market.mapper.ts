import type { Depth, MarketSummary, Trade } from '../domain/marketData';
import type { DepthResponse, MarketSummaryResponse, TradeResponse } from './market.api';

const present = (value: string | null): string | undefined => value ?? undefined;

export const toMarketSummary = (response: MarketSummaryResponse): MarketSummary => ({
  spread: present(response.spread),
  min: present(response.min),
  max: present(response.max),
  volume: response.volume,
  asOf: present(response.asOf),
});

export const toDepth = (response: DepthResponse): Depth => ({
  bids: response.buys.map(({ price, quantity }) => ({ price, quantity })),
  asks: response.sells.map(({ price, quantity }) => ({ price, quantity })),
  sequence: response.sequence,
  asOf: present(response.asOf),
});

export const toTrades = (response: readonly TradeResponse[]): Trade[] =>
  response.map(({ tradeId, side, price, quantity, timestamp }) => ({ tradeId, side, price, quantity, timestamp }));
