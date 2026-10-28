import './ui/market.css';

export { useMarket } from './application/useMarket';
export { useMarketSummary } from './application/useMarketSummary';
export { useDepth } from './application/useDepth';
export { useTrades } from './application/useTrades';
export { marketApiKey } from './application/marketApiProvider';
export { marketQueryKey } from './application/marketQueryKeys';
export { default as MarketHeader } from './ui/MarketHeader.vue';
export { default as OrderBookPanel } from './ui/OrderBookPanel.vue';
export { default as DepthChart } from './ui/DepthChart.vue';
export { default as RecentTrades } from './ui/RecentTrades.vue';
export { default as MarketDataNotice } from './ui/MarketDataNotice.vue';
export { default as MarketNotFound } from './ui/MarketNotFound.vue';
export type { Depth, DepthLevel, MarketSummary, Trade } from './domain/marketData';
export type { MarketApi } from './infra/market.api';
