import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import { previewBook } from '../domain/marketPreview';
import { useMarketPreviewApi } from './marketPreviewApiProvider';

const marketId = 'BTC-USD';
const precision = 2;
const levels = 5;
const tradeCount = 20;
const pollMs = 3_000;

/** A read-only glimpse of the live market for the sign-in screens; it never blocks the form and stays quiet on failure. */
export const useMarketPreview = () => {
  const api = useMarketPreviewApi();
  const polling = { refetchInterval: pollMs, refetchIntervalInBackground: false } as const;
  const depth = useQuery({ queryKey: ['identity', 'marketPreview', marketId, 'depth', precision], queryFn: () => api.depth(marketId, precision), ...polling });
  const trades = useQuery({ queryKey: ['identity', 'marketPreview', marketId, 'trades', tradeCount], queryFn: () => api.trades(marketId, tradeCount), ...polling });

  return {
    marketId,
    book: computed(() => previewBook(depth.data.value?.asks ?? [], depth.data.value?.bids ?? [], levels)),
    lastTrade: computed(() => trades.data.value?.[0]),
    recentTrades: computed(() => (trades.data.value ?? []).slice(0, 4)),
    loading: computed(() => depth.isPending.value || trades.isPending.value),
    live: computed(() => depth.data.value !== undefined && depth.error.value === null && trades.error.value === null),
  };
};
