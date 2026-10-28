import { useQuery } from '@tanstack/vue-query';
import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { openStatuses } from '@/entities/order';
import { isApiError } from '@/shared/api/apiError';
import { filterCounts, filterOrders, hasOpenOrder } from '../domain/order';
import type { Order, OrderFilter } from '../domain/order';
import { useOrdersApi } from './ordersApiProvider';

export const ordersQueryKey = ['orders'] as const;
export const orderListQueryKey = (accountId: string) => [...ordersQueryKey, 'list', accountId] as const;
export const orderQueryKey = (orderId: string) => [...ordersQueryKey, 'detail', orderId] as const;

const pollingMs = 3_000;

/** Polls while something can still change; after a 429 it waits what the edge asked for. */
const pollWhile = <T>(stillMoving: (data: T) => boolean) => (query: { readonly state: { readonly data: T | undefined; readonly error: unknown } }): number | false => {
  const { error, data } = query.state;
  if (isApiError(error) && error.kind === 'rateLimited') return (error.retryAfterSeconds ?? pollingMs / 1_000) * 1_000;
  if (data === undefined) return false;
  return stillMoving(data) ? pollingMs : false;
};

export const useOrders = (accountId: MaybeRefOrGetter<string | undefined>, filter: MaybeRefOrGetter<OrderFilter>) => {
  const api = useOrdersApi();
  const query = useQuery({
    queryKey: computed(() => orderListQueryKey(toValue(accountId) ?? '')),
    queryFn: () => api.ordersOf(String(toValue(accountId))),
    enabled: computed(() => toValue(accountId) !== undefined),
    refetchInterval: pollWhile((orders: readonly Order[]) => hasOpenOrder(orders)),
    refetchIntervalInBackground: false,
  });

  return {
    orders: computed(() => filterOrders(query.data.value ?? [], toValue(filter))),
    counts: computed(() => filterCounts(query.data.value ?? [])),
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => query.refetch(),
  };
};

export const useOrder = (orderId: MaybeRefOrGetter<string>) => {
  const api = useOrdersApi();
  const query = useQuery({
    queryKey: computed(() => orderQueryKey(toValue(orderId))),
    queryFn: () => api.order(toValue(orderId)),
    refetchInterval: pollWhile((order: Order) => openStatuses.has(order.status)),
    refetchIntervalInBackground: false,
  });

  return {
    order: query.data,
    isLoading: query.isLoading,
    notFound: computed(() => isApiError(query.error.value) && query.error.value.kind === 'notFound'),
    error: query.error,
    refetch: () => query.refetch(),
  };
};
