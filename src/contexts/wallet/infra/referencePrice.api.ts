import type { HttpClient } from '@/shared/api/httpClient';

/** Only what the wallet needs from the public trades feed: the price of the latest trade. */
interface LastTradeResponse {
  readonly price: string;
}

export interface ReferencePriceApi {
  lastTradePrice(marketId: string): Promise<string | undefined>;
}

export const createReferencePriceApi = (http: HttpClient): ReferencePriceApi => ({
  lastTradePrice: async (marketId) => (await http.get<readonly LastTradeResponse[]>(`/markets/${encodeURIComponent(marketId)}/trades?limit=1`))[0]?.price,
});
