/** Everything this context caches for a market sits under one prefix, so a page can invalidate it at once. */
export const marketQueryKey = (marketId: string) => ['market', marketId] as const;

export const marketSummaryKey = (marketId: string) => [...marketQueryKey(marketId), 'summary'] as const;

export const marketDepthKey = (marketId: string, precision: number) => [...marketQueryKey(marketId), 'depth', precision] as const;

export const marketTradesKey = (marketId: string, limit: number) => [...marketQueryKey(marketId), 'trades', limit] as const;
