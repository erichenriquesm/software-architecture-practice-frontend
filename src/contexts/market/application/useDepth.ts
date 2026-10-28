import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { toDepth } from '../infra/market.mapper';
import { useMarketApi } from './marketApiProvider';
import { marketDepthKey } from './marketQueryKeys';
import { pollingOptions } from './polling';

/** The book grouped in price buckets of 10^precision; keeps the previous grouping on screen while the new one loads. */
export const useDepth = (marketId: MaybeRefOrGetter<string>, precision: MaybeRefOrGetter<number>, enabled: MaybeRefOrGetter<boolean> = true) => {
  const api = useMarketApi();
  return useQuery({
    queryKey: computed(() => marketDepthKey(toValue(marketId), toValue(precision))),
    queryFn: async () => toDepth(await api.depth(toValue(marketId), toValue(precision))),
    enabled: computed(() => toValue(enabled)),
    placeholderData: keepPreviousData,
    ...pollingOptions,
  });
};
