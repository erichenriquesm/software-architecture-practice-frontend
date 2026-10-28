import { useQuery } from '@tanstack/vue-query';
import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { useWalletApi } from './walletApiProvider';

export interface Balance {
  readonly assetId: string;
  readonly available: string;
  readonly reserved: string;
}

export const balancesQueryKey = (accountId: string) => ['wallet', 'balances', accountId] as const;

/** Balances of the signed-in account, from the account projection (eventually consistent, so it polls). */
export const useBalances = (accountId: MaybeRefOrGetter<string | undefined>) => {
  const api = useWalletApi();
  const query = useQuery({
    queryKey: computed(() => balancesQueryKey(toValue(accountId) ?? '')),
    queryFn: async (): Promise<readonly Balance[]> => {
      const account = await api.account(String(toValue(accountId)));
      return account.assets.map(({ assetId, available, reserved }) => ({ assetId, available, reserved }));
    },
    enabled: computed(() => toValue(accountId) !== undefined),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  const balances = computed(() => query.data.value ?? []);
  const availableOf = (assetId: string): string => balances.value.find((balance) => balance.assetId === assetId)?.available ?? '0';

  return { balances, availableOf, isLoading: query.isLoading, error: query.error, refetch: () => query.refetch() };
};
