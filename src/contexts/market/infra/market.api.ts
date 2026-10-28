import type { HttpClient } from '@/shared/api/httpClient';

export interface MarketSummaryResponse {
  readonly spread: string | null;
  readonly min: string | null;
  readonly max: string | null;
  readonly volume: string;
  readonly asOf: string | null;
}

export interface DepthLevelResponse {
  readonly quantity: string;
  readonly price: string;
}

export interface DepthResponse {
  readonly buys: readonly DepthLevelResponse[];
  readonly sells: readonly DepthLevelResponse[];
  readonly sequence: number;
  readonly asOf: string | null;
}

export interface TradeResponse {
  readonly tradeId: string;
  readonly buyOrderId: string;
  readonly sellOrderId: string;
  readonly side: 'buy' | 'sell';
  readonly quantity: string;
  readonly price: string;
  readonly timestamp: string;
}

export interface MarketApi {
  summary(marketId: string): Promise<MarketSummaryResponse>;
  depth(marketId: string, precision: number): Promise<DepthResponse>;
  trades(marketId: string, limit: number): Promise<readonly TradeResponse[]>;
}

const marketPath = (marketId: string) => `/markets/${encodeURIComponent(marketId)}`;

export const createMarketApi = (http: HttpClient): MarketApi => ({
  summary: (marketId) => http.get<MarketSummaryResponse>(marketPath(marketId)),
  depth: (marketId, precision) => http.get<DepthResponse>(`${marketPath(marketId)}/depth?precision=${precision}`),
  trades: (marketId, limit) => http.get<readonly TradeResponse[]>(`${marketPath(marketId)}/trades?limit=${limit}`),
});
