import { useQuery } from '@tanstack/vue-query';
import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { toMarketSummary } from '../infra/market.mapper';
import { useMarketApi } from './marketApiProvider';
import { marketSummaryKey } from './marketQueryKeys';
import { pollingOptions } from './polling';

/** 24 h rolling stats of a market (high, low, volume) and its spread. */
export const useMarketSummary = (marketId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean> = true) => {
  const api = useMarketApi();
  return useQuery({
    queryKey: computed(() => marketSummaryKey(toValue(marketId))),
    queryFn: async () => toMarketSummary(await api.summary(toValue(marketId))),
    enabled: computed(() => toValue(enabled)),
    ...pollingOptions,
  });
};
