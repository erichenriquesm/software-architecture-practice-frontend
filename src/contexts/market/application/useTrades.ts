import { useQuery } from '@tanstack/vue-query';
import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { toTrades } from '../infra/market.mapper';
import { useMarketApi } from './marketApiProvider';
import { marketTradesKey } from './marketQueryKeys';
import { pollingOptions } from './polling';

/** Up to 50 trades cost the smallest rate-limit weight on the backend. */
export const recentTradesLimit = 20;

/** Most recent trades first; the first one is the last price. */
export const useTrades = (marketId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean> = true) => {
  const api = useMarketApi();
  return useQuery({
    queryKey: computed(() => marketTradesKey(toValue(marketId), recentTradesLimit)),
    queryFn: async () => toTrades(await api.trades(toValue(marketId), recentTradesLimit)),
    enabled: computed(() => toValue(enabled)),
    ...pollingOptions,
  });
};
