/** Copy of the market filters the backend enforces (backend infra/schemas/markets.json, sdd Q11). */
export interface Market {
  readonly marketId: string;
  readonly base: string;
  readonly quote: string;
  readonly tickSize: string;
  readonly stepSize: string;
  readonly minNotional: string;
}

export const markets: readonly Market[] = [{ marketId: 'BTC-USD', base: 'BTC', quote: 'USD', tickSize: '0.01', stepSize: '0.00001', minNotional: '5' }];

export const defaultMarketId = 'BTC-USD';

export const marketOf = (marketId: string): Market | undefined => markets.find((market) => market.marketId === marketId);

export type AssetId = 'BTC' | 'USD';

export const assets: readonly AssetId[] = ['USD', 'BTC'];

export const assetPrecision: Readonly<Record<AssetId, number>> = { BTC: 8, USD: 2 };
