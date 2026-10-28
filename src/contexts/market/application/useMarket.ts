import { computed, ref, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { isApiError } from '@/shared/api/apiError';
import { marketOf } from '@/entities/market';
import { bestAsk, bestBid, defaultDepthPrecision, spreadOf } from '../domain/depth';
import { emptyDepth } from '../domain/marketData';
import { useDepth } from './useDepth';
import { useMarketSummary } from './useMarketSummary';
import { useTrades } from './useTrades';

/** The exact book (no grouping) gives the real best bid and ask, whatever grouping the user picked. */
const exactPrecision = -2;

/** Everything the market screen shows, polled; nothing is fetched for a market the app does not know. */
export const useMarket = (marketId: MaybeRefOrGetter<string>) => {
  const market = computed(() => marketOf(toValue(marketId)));
  const known = computed(() => market.value !== undefined);
  const precision = ref(defaultDepthPrecision);

  const summary = useMarketSummary(marketId, known);
  const groupedDepth = useDepth(marketId, precision, known);
  const exactDepth = useDepth(marketId, exactPrecision, known);
  const trades = useTrades(marketId, known);
  const queries = [summary, groupedDepth, exactDepth, trades];

  const book = computed(() => groupedDepth.data.value ?? emptyDepth);
  const exactBook = computed(() => exactDepth.data.value ?? emptyDepth);
  const topBid = computed(() => bestBid(exactBook.value.bids));
  const topAsk = computed(() => bestAsk(exactBook.value.asks));
  const failures = computed(() => queries.map((query) => query.error.value).filter((error) => error !== null));

  return {
    market,
    precision,
    summary: computed(() => summary.data.value),
    book,
    exactBook,
    trades: computed(() => trades.data.value ?? []),
    lastPrice: computed(() => trades.data.value?.[0]?.price),
    bestBid: topBid,
    bestAsk: topAsk,
    spread: computed(() => spreadOf(topBid.value, topAsk.value)),
    bookLoading: computed(() => groupedDepth.isPending.value && known.value),
    depthLoading: computed(() => exactDepth.isPending.value && known.value),
    tradesLoading: computed(() => trades.isPending.value && known.value),
    summaryLoading: computed(() => summary.isPending.value && known.value),
    /** When the book last changed, as the server reports it; undefined before the first change. */
    changedAt: computed(() => summary.data.value?.asOf),
    notFound: computed(() => !known.value || failures.value.some((error) => isApiError(error) && error.kind === 'notFound')),
    delayed: computed(() => failures.value.length > 0),
    rateLimited: computed(() => failures.value.some((error) => isApiError(error) && error.kind === 'rateLimited')),
    retryNow: () => Promise.all(queries.map((query) => query.refetch())),
  };
};
