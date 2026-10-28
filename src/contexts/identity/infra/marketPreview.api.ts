import type { HttpClient } from '@/shared/api/httpClient';
import type { PreviewLevel, PreviewTrade } from '../domain/marketPreview';

/** Public market data, read before anyone signs in. Same contract as the market context, kept local: contexts never import each other. */
export interface PreviewDepthResponse {
  readonly buys: readonly PreviewLevel[];
  readonly sells: readonly PreviewLevel[];
}

export interface PreviewTradeResponse extends PreviewTrade {
  readonly timestamp: string;
}

export interface PreviewDepth {
  readonly bids: readonly PreviewLevel[];
  readonly asks: readonly PreviewLevel[];
}

export interface MarketPreviewApi {
  depth(marketId: string, precision: number): Promise<PreviewDepth>;
  trades(marketId: string, limit: number): Promise<readonly PreviewTrade[]>;
}

const marketPath = (marketId: string) => `/markets/${encodeURIComponent(marketId)}`;
const level = ({ price, quantity }: PreviewLevel): PreviewLevel => ({ price, quantity });

export const createMarketPreviewApi = (http: HttpClient): MarketPreviewApi => ({
  depth: async (marketId, precision) => {
    const response = await http.get<PreviewDepthResponse>(`${marketPath(marketId)}/depth?precision=${precision}`);
    return { bids: response.buys.map(level), asks: response.sells.map(level) };
  },
  trades: async (marketId, limit) => {
    const response = await http.get<readonly PreviewTradeResponse[]>(`${marketPath(marketId)}/trades?limit=${limit}`);
    return response.map(({ tradeId, side, price, quantity }) => ({ tradeId, side, price, quantity }));
  },
});
