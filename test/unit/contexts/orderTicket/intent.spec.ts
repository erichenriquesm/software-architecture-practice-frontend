import { describe, expect, test } from 'vitest';
import { intentFor } from '@/contexts/orderTicket/domain/intent';

const order = { side: 'buy', price: '83000.00', quantity: '0.5' } as const;
const keys = () => {
  let count = 0;
  return () => `key-${(count += 1)}`;
};

describe('Order intent', () => {
  test('Should give a new intent its own key', () => {
    expect(intentFor(order, undefined, keys())).toEqual({ order, idempotencyKey: 'key-1' });
  });

  test('Should reuse the key when the same unfinished order is confirmed again', () => {
    const newKey = keys();
    const first = intentFor(order, undefined, newKey);

    expect(intentFor({ ...order }, first, newKey).idempotencyKey).toBe('key-1');
  });

  test('Should treat a changed order as a new intent', () => {
    const newKey = keys();
    const first = intentFor(order, undefined, newKey);

    expect(intentFor({ ...order, quantity: '0.6' }, first, newKey).idempotencyKey).toBe('key-2');
    expect(intentFor({ ...order, side: 'sell' }, first, newKey).idempotencyKey).toBe('key-3');
  });
});
