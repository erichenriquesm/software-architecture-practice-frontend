import { useMutation, useQuery } from '@tanstack/vue-query';
import { computed, ref, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { Market } from '@/entities/market';
import type { Side } from '@/entities/order';
import { isApiError, isRetryable } from '@/shared/api/apiError';
import { newIdempotencyKey } from '@/shared/api/idempotency';
import { useForm } from '@/shared/forms/useForm';
import { intentFor } from '../domain/intent';
import type { OrderIntent } from '../domain/intent';
import { createTicketSchema, orderTotal, reservationOf } from '../domain/ticket';
import type { TicketFields, TicketOrder, TicketValues } from '../domain/ticket';
import { useOrderTicketApi } from './orderTicketApiProvider';
import { rateLimitMessage, rejectionMessage, ticketErrorMessage } from './ticketErrors';
import type { TicketErrorMessage } from './ticketErrors';
import { useCountdown } from './useCountdown';

export interface OrderTicketInput {
  readonly market: Market;
  /** Free balance per asset; undefined while the balances are loading. */
  readonly available: MaybeRefOrGetter<Readonly<Partial<Record<string, string>>> | undefined>;
  readonly onPlaced?: ((orderId: string) => void) | undefined;
}

export interface PlacedOrder {
  readonly orderId: string;
  readonly order: TicketOrder;
}

export type TicketStep = 'editing' | 'confirming';

const defaultRetryAfterSeconds = 5;
const trackingIntervalMs = 1_000;

/** The limit-order ticket: form, review step, a single send per intent and what happened to the order afterwards. */
export const useOrderTicket = (input: OrderTicketInput) => {
  const api = useOrderTicketApi();
  const { market } = input;
  const availableOf = (assetId: string) => toValue(input.available)?.[assetId];
  const form = useForm<TicketValues, TicketFields>(createTicketSchema(market, availableOf), { side: 'buy', price: '', quantity: '' });
  const step = ref<TicketStep>('editing');
  const draft = ref<TicketOrder | undefined>(undefined);
  const placed = ref<PlacedOrder | undefined>(undefined);
  const countdown = useCountdown();
  /** Kept only while the last attempt failed in a way that may be retried with the same key. */
  let unfinished: OrderIntent | undefined;

  const mutation = useMutation({
    mutationFn: (intent: OrderIntent) => api.placeOrder({ marketId: market.marketId, ...intent.order }, intent.idempotencyKey),
    onSuccess: (response, intent) => {
      step.value = 'editing';
      unfinished = undefined;
      placed.value = { orderId: response.orderId, order: intent.order };
      input.onPlaced?.(response.orderId);
    },
    onError: (error, intent) => {
      step.value = 'editing';
      unfinished = isRetryable(error) ? intent : undefined;
      if (isApiError(error) && error.kind === 'rateLimited') countdown.start(error.retryAfterSeconds ?? defaultRetryAfterSeconds);
    },
  });

  const tracking = useQuery({
    queryKey: computed(() => ['orderTicket', 'placed', placed.value?.orderId ?? ''] as const),
    queryFn: () => api.order(String(placed.value?.orderId)),
    enabled: computed(() => placed.value !== undefined),
    refetchInterval: (query) => (query.state.data === undefined || query.state.data.status === 'pending' ? trackingIntervalMs : false),
  });

  const side = computed<Side>({
    get: () => form.values.side,
    set: (value) => {
      form.values.side = value;
    },
  });

  const blocked = computed(() => countdown.secondsLeft.value > 0);

  const review = () => {
    if (blocked.value || mutation.isPending.value) return;
    const order = form.validate();
    if (!order) return;
    draft.value = order;
    placed.value = undefined;
    mutation.reset();
    step.value = 'confirming';
  };

  const back = () => {
    if (mutation.isPending.value) return;
    step.value = 'editing';
  };

  /** The key is born here, on the user's confirmation, and every retry of this intent carries it. */
  const confirm = () => {
    if (!draft.value || blocked.value || mutation.isPending.value) return;
    const intent = intentFor(draft.value, unfinished, newIdempotencyKey);
    unfinished = intent;
    mutation.mutate(intent);
  };

  const errorMessage = computed<TicketErrorMessage | undefined>(() => {
    if (blocked.value) return rateLimitMessage(countdown.secondsLeft.value);
    return ticketErrorMessage(mutation.error.value);
  });

  const rejection = computed(() => {
    const order = tracking.data.value;
    if (order?.status !== 'rejected') return undefined;
    return rejectionMessage(order.statusReason ?? undefined);
  });

  return {
    form,
    side,
    step,
    draft,
    placed,
    total: computed(() => orderTotal(form.values.price, form.values.quantity)),
    reservation: computed(() => reservationOf(market, form.values.side, form.values.price, form.values.quantity)),
    availableForSide: computed(() => availableOf(form.values.side === 'buy' ? market.quote : market.base)),
    pending: mutation.isPending,
    blocked,
    secondsLeft: countdown.secondsLeft,
    errorMessage,
    errorIsWarning: computed(() => blocked.value),
    rejection,
    review,
    back,
    confirm,
  };
};
