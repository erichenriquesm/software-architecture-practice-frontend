import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed } from 'vue';
import { newIdempotencyKey } from '@/shared/api/idempotency';
import { cancelErrorMessage } from './cancelErrors';
import { useOrdersApi } from './ordersApiProvider';
import { ordersQueryKey } from './useOrders';

export interface CancelOrderInput {
  readonly orderId: string;
  readonly idempotencyKey: string;
}

/** Each click is one cancel intent with its own key; the HTTP client retries it with that same key. */
export const useCancelOrder = (options: { onCancelled?: () => void } = {}) => {
  const api = useOrdersApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ orderId, idempotencyKey }: CancelOrderInput) => api.cancel({ orderId }, idempotencyKey),
    onSuccess: () => options.onCancelled?.(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ordersQueryKey }),
  });

  return {
    cancel: (orderId: string) => mutation.mutate({ orderId, idempotencyKey: newIdempotencyKey() }),
    cancellingId: computed(() => (mutation.isPending.value ? mutation.variables.value?.orderId : undefined)),
    failedId: computed(() => (mutation.isError.value ? mutation.variables.value?.orderId : undefined)),
    errorMessage: computed(() => cancelErrorMessage(mutation.error.value)),
  };
};
