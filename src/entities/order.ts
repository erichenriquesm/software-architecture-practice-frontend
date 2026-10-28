export type Side = 'buy' | 'sell';

export const sideLabels: Readonly<Record<Side, string>> = { buy: 'Compra', sell: 'Venda' };

export type OrderStatus = 'pending' | 'open' | 'partiallyFilled' | 'filled' | 'cancelling' | 'cancelled' | 'rejected' | 'expired';

export const openStatuses: ReadonlySet<OrderStatus> = new Set(['pending', 'open', 'partiallyFilled', 'cancelling']);

export const isCancellable = (status: OrderStatus): boolean => status === 'pending' || status === 'open' || status === 'partiallyFilled';
