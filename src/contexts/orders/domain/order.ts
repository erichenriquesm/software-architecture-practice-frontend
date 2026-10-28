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
