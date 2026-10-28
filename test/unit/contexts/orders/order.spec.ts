import { describe, expect, test } from 'vitest';
import { canCancel, filledValue, filterOrders, fillPercentage, hasOpenOrder, remainingQuantity, statusReasonText } from '@/contexts/orders/domain/order';
import type { Order } from '@/contexts/orders/domain/order';
import { toOrder } from '@/contexts/orders/infra/orders.api';
import type { OrderStatus } from '@/entities/order';

const orderWith = (status: OrderStatus, changes: Partial<Order> = {}): Order => ({
  orderId: `order-${status}`,
  marketId: 'BTC-USD',
  side: 'buy',
  quantity: '10.00000000',
  price: '83000.00',
  fillQuantity: '0.00000000',
  createdAt: '2026-10-28T13:47:22.000Z',
  status,
  ...changes,
});

const all: readonly OrderStatus[] = ['pending', 'open', 'partiallyFilled', 'filled', 'cancelling', 'cancelled', 'rejected', 'expired'];
const orders = all.map((status) => orderWith(status));
const statusesIn = (filter: Parameters<typeof filterOrders>[1]) => filterOrders(orders, filter).map((order) => order.status);

describe('Order filters', () => {
  test('Should group the statuses the way the filters read', () => {
    expect(statusesIn('all')).toEqual(all);
    expect(statusesIn('open')).toEqual(['pending', 'open', 'partiallyFilled', 'cancelling']);
    expect(statusesIn('filled')).toEqual(['filled']);
    expect(statusesIn('closed')).toEqual(['cancelled', 'rejected', 'expired']);
  });

  test('Should only offer cancel while the order can still leave the book', () => {
    expect(orders.filter(canCancel).map((order) => order.status)).toEqual(['pending', 'open', 'partiallyFilled']);
  });

  test('Should keep polling only while some order can still change', () => {
    expect(hasOpenOrder([orderWith('filled'), orderWith('cancelling')])).toBe(true);
    expect(hasOpenOrder([orderWith('filled'), orderWith('rejected')])).toBe(false);
  });
});

describe('Order execution', () => {
  test('Should compute the filled share with decimals, rounding down', () => {
    expect(fillPercentage({ quantity: '10.00000000', fillQuantity: '5.00000000' })).toBe(50);
    expect(fillPercentage({ quantity: '0.3', fillQuantity: '0.1' })).toBe(33);
    expect(fillPercentage({ quantity: '1', fillQuantity: '0.99999999' })).toBe(99);
    expect(fillPercentage({ quantity: '1', fillQuantity: '1' })).toBe(100);
    expect(fillPercentage({ quantity: '0', fillQuantity: '0' })).toBe(0);
  });

  test('Should derive what is left and what was paid without floating point', () => {
    expect(remainingQuantity({ quantity: '0.3', fillQuantity: '0.1' })).toBe('0.2');
    expect(filledValue({ fillQuantity: '0.1', fillPrice: '83000.10' })).toBe('8300.01');
    expect(filledValue({ fillQuantity: '0' })).toBeUndefined();
  });

  test('Should explain final statuses in plain Portuguese', () => {
    expect(statusReasonText('INSUFFICIENT_FUNDS')).toContain('Não havia saldo disponível');
    expect(statusReasonText('SELF_TRADE_PREVENTION')).toBe('A ordem foi cancelada para não negociar com outra ordem sua.');
    expect(statusReasonText('SOMETHING_NEW')).toBeUndefined();
    expect(statusReasonText(undefined)).toBeUndefined();
  });

  test('Should map the API nulls to absent fields at the edge', () => {
    const order = toOrder({ orderId: 'o1', marketId: 'BTC-USD', side: 'sell', quantity: '1', price: '2', fillQuantity: '0', fillPrice: null, timestamp: '2026-10-28T13:47:22.000Z', status: 'open', statusReason: null });

    expect(order).toEqual({ orderId: 'o1', marketId: 'BTC-USD', side: 'sell', quantity: '1', price: '2', fillQuantity: '0', fillPrice: undefined, createdAt: '2026-10-28T13:47:22.000Z', status: 'open', statusReason: undefined });
  });
});
