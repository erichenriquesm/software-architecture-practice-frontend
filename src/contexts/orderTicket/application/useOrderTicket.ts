import { useMutation, useQuery } from '@tanstack/vue-query';
import { Decimal } from 'decimal.js';
import { computed, ref, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { Market } from '@/entities/market';
import type { Side } from '@/entities/order';
import { decimalPattern, decimalPlaces, normalizeTypedDecimal } from '@/entities/decimal';
import { isApiError, isRetryable } from '@/shared/api/apiError';
import { newIdempotencyKey } from '@/shared/api/idempotency';
import { formatDecimal } from '@/shared/format/decimal';
import { useForm } from '@/shared/forms/useForm';
import { intentFor } from '../domain/intent';
import type { OrderIntent } from '../domain/intent';
import { balanceUse, quantityForShare, shares } from '../domain/share';
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
  const availableForSide = computed(() => availableOf(form.values.side === 'buy' ? market.quote : market.base));
  const reservation = computed(() => reservationOf(market, form.values.side, form.values.price, form.values.quantity));

  /** A price chosen elsewhere (the book, the best price) lands in the field as the user would have typed it. */
  const applyPrice = (price: string) => {
    form.values.price = formatDecimal(price, decimalPlaces(market.tickSize));
    form.touch('price');
  };

  const quantityFor = (share: string) => quantityForShare(market, form.values.side, share, availableForSide.value, form.values.price);

  /** Fills the quantity that spends this share of the free balance; does nothing while it cannot be known. */
  const fillShare = (share: string) => {
    const quantity = quantityFor(share);
    if (quantity === undefined) return;
    form.values.quantity = formatDecimal(quantity, decimalPlaces(market.stepSize));
    form.touch('quantity');
  };

  /** The chip matching what is in the quantity field, so it reads as pressed. */
  const activeShare = computed(() => {
    const typed = normalizeTypedDecimal(form.values.quantity);
    if (!decimalPattern.test(typed) || new Decimal(typed).isZero()) return undefined;
    return shares.find((share) => {
      const quantity = quantityFor(share.value);
      return quantity !== undefined && new Decimal(quantity).equals(typed);
    })?.value;
  });

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
    reservation,
    availableForSide,
    balanceUse: computed(() => balanceUse(reservation.value?.amount, availableForSide.value)),
    canFillShares: computed(() => quantityFor('1') !== undefined),
    activeShare,
    pending: mutation.isPending,
    blocked,
    secondsLeft: countdown.secondsLeft,
    errorMessage,
    errorIsWarning: computed(() => blocked.value),
    rejection,
    review,
    back,
    confirm,
    applyPrice,
    fillShare,
  };
};
