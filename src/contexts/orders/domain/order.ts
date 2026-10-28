import { Decimal } from 'decimal.js';
import { isCancellable, openStatuses } from '@/entities/order';
import type { OrderStatus, Side } from '@/entities/order';

export interface Order {
  readonly orderId: string;
  readonly marketId: string;
  readonly side: Side;
  readonly quantity: string;
  readonly price: string;
  readonly fillQuantity: string;
  /** Average fill price; absent until something is filled. */
  readonly fillPrice?: string | undefined;
  readonly createdAt: string;
  readonly status: OrderStatus;
  readonly statusReason?: string | undefined;
}

export type OrderFilter = 'all' | 'open' | 'filled' | 'closed';

export const orderFilters: readonly OrderFilter[] = ['all', 'open', 'filled', 'closed'];

export const orderFilterLabels: Readonly<Record<OrderFilter, string>> = {
  all: 'Todas',
  open: 'Abertas',
  filled: 'Executadas',
  closed: 'Canceladas e rejeitadas',
};

const statusesOf: Readonly<Record<Exclude<OrderFilter, 'all'>, ReadonlySet<OrderStatus>>> = {
  open: openStatuses,
  filled: new Set(['filled']),
  closed: new Set(['cancelled', 'rejected', 'expired']),
};

export const matchesFilter = (order: Order, filter: OrderFilter): boolean => filter === 'all' || statusesOf[filter].has(order.status);

export const filterOrders = (orders: readonly Order[], filter: OrderFilter): readonly Order[] => orders.filter((order) => matchesFilter(order, filter));

/** How many orders each filter would show, for the counts on the filter chips. */
export const filterCounts = (orders: readonly Order[]): Readonly<Record<OrderFilter, number>> => ({
  all: orders.length,
  open: filterOrders(orders, 'open').length,
  filled: filterOrders(orders, 'filled').length,
  closed: filterOrders(orders, 'closed').length,
});

/** Still moving: the list shows a live dot next to these statuses. */
export const isLive = (status: OrderStatus): boolean => status === 'pending' || status === 'open' || status === 'partiallyFilled' || status === 'cancelling';

export const hasOpenOrder = (orders: readonly Order[]): boolean => orders.some((order) => openStatuses.has(order.status));

export const canCancel = (order: Order): boolean => isCancellable(order.status);

/** Share of the quantity already filled, from 0 to 100, rounded down so 100 only means fully filled. */
export const fillPercentage = (order: Pick<Order, 'quantity' | 'fillQuantity'>): number => {
  const quantity = new Decimal(order.quantity);
  if (quantity.isZero()) return 0;
  return new Decimal(order.fillQuantity).dividedBy(quantity).times(100).toDecimalPlaces(0, Decimal.ROUND_DOWN).toNumber();
};

export const remainingQuantity = (order: Pick<Order, 'quantity' | 'fillQuantity'>): string => new Decimal(order.quantity).minus(order.fillQuantity).toFixed();

/** What was paid (buy) or received (sell) so far, in the quote asset. */
export const filledValue = (order: Pick<Order, 'fillQuantity' | 'fillPrice'>): string | undefined =>
  order.fillPrice === undefined ? undefined : new Decimal(order.fillQuantity).times(order.fillPrice).toFixed();

/** "10.00000000" -> "10", for titles; tables keep the asset precision. */
export const withoutTrailingZeros = (value: string): string => new Decimal(value).toFixed();

const reasonTexts: Readonly<Record<string, string>> = {
  INSUFFICIENT_FUNDS: 'Não havia saldo disponível para reservar quando a ordem chegou. Deposite mais ou reduza a quantidade.',
  WALLET_NOT_FOUND: 'A carteira da conta não foi encontrada. Fale com o suporte.',
  EXPIRED: 'A reserva de saldo não foi confirmada a tempo e a ordem expirou. Envie de novo.',
  SELF_TRADE_PREVENTION: 'A ordem foi cancelada para não negociar com outra ordem sua.',
};

export const statusReasonText = (reason: string | undefined): string | undefined => {
  if (reason === undefined) return undefined;
  const known = Object.keys(reasonTexts).find((code) => reason.includes(code));
  return known === undefined ? undefined : reasonTexts[known];
};

/** Price times quantity: what the whole order is worth at its limit, in the quote asset. */
export const orderNotional = (order: Pick<Order, 'price' | 'quantity'>): string => new Decimal(order.price).times(order.quantity).toFixed();

export type OrderStepKey = 'received' | 'reserved' | 'onBook' | 'outcome';

/**
 * done: it happened. current: where the order is now. upcoming: not yet. failed: the order ended there.
 * skipped: the order ended before it, so it never happens. unknown: the status alone does not say whether it happened.
 */
export type OrderStepState = 'done' | 'current' | 'upcoming' | 'failed' | 'skipped' | 'unknown';

export type OrderStepTone = 'neutral' | 'success' | 'danger';

export interface OrderStep {
  readonly key: OrderStepKey;
  readonly label: string;
  readonly state: OrderStepState;
  readonly tone: OrderStepTone;
}

type StepStates = readonly [OrderStepState, OrderStepState, OrderStepState, OrderStepState];

const outcomeLabels: Readonly<Record<OrderStatus, string>> = {
  pending: 'Executada',
  open: 'Executada',
  partiallyFilled: 'Executada',
  filled: 'Executada',
  cancelling: 'Cancelando',
  cancelled: 'Cancelada',
  rejected: 'Rejeitada',
  expired: 'Expirada',
};

/**
 * The path of an order, read only from its current status (and whether anything filled). The API gives no history,
 * so steps carry no time, and a step the status cannot vouch for stays "unknown" instead of being invented.
 */
export const orderSteps = (order: Pick<Order, 'status' | 'fillQuantity'>): readonly OrderStep[] => {
  const filledSome = new Decimal(order.fillQuantity).greaterThan(0);
  const reachedBook: OrderStepState = filledSome ? 'done' : 'unknown';
  const states: Readonly<Record<OrderStatus, StepStates>> = {
    pending: ['done', 'current', 'upcoming', 'upcoming'],
    open: ['done', 'done', 'current', 'upcoming'],
    partiallyFilled: ['done', 'done', 'current', 'upcoming'],
    filled: ['done', 'done', 'done', 'done'],
    cancelling: ['done', reachedBook, reachedBook, 'current'],
    cancelled: ['done', reachedBook, reachedBook, 'done'],
    rejected: ['done', 'failed', 'skipped', 'failed'],
    expired: ['done', reachedBook, reachedBook, 'failed'],
  };
  const [received, reserved, onBook, outcome] = states[order.status];
  const outcomeTone: OrderStepTone = order.status === 'filled' ? 'success' : order.status === 'rejected' ? 'danger' : 'neutral';
  return [
    { key: 'received', label: 'Recebida', state: received, tone: 'neutral' },
    { key: 'reserved', label: 'Saldo reservado', state: reserved, tone: reserved === 'failed' ? 'danger' : 'neutral' },
    { key: 'onBook', label: order.status === 'partiallyFilled' ? 'No livro, executada em parte' : 'No livro', state: onBook, tone: 'neutral' },
    { key: 'outcome', label: outcomeLabels[order.status], state: outcome, tone: outcomeTone },
  ];
};
