import { useQuery } from '@tanstack/vue-query';
import { computed, inject } from 'vue';
import type { InjectionKey } from 'vue';
import { httpClient } from '@/shared/api/httpClient';
import { createReferencePriceApi } from '../infra/referencePrice.api';
import type { ReferencePriceApi } from '../infra/referencePrice.api';

export const referencePriceApiKey: InjectionKey<ReferencePriceApi> = Symbol('referencePriceApi');

const marketId = 'BTC-USD';

/** Last BTC-USD trade price, to estimate the wallet in USD. Read-only, slow polling: it is only an estimate. */
export const useReferencePrice = () => {
  const api = inject(referencePriceApiKey, () => createReferencePriceApi(httpClient), true);
  const query = useQuery({
    queryKey: ['wallet', 'referencePrice', marketId],
    queryFn: async () => (await api.lastTradePrice(marketId)) ?? null,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
  return { price: computed(() => query.data.value ?? undefined), isLoading: query.isLoading };
};
