import { describe, expect, test } from 'vitest';
import { filterCounts, isLive, orderNotional, orderSteps } from '@/contexts/orders/domain/order';
import type { Order } from '@/contexts/orders/domain/order';
import type { OrderStatus } from '@/entities/order';

const orderWith = (status: OrderStatus, fillQuantity = '0.00000000'): Order => ({
  orderId: `order-${status}`,
  marketId: 'BTC-USD',
  side: 'buy',
  quantity: '10.00000000',
  price: '83000.00',
  fillQuantity,
  createdAt: '2026-10-28T13:47:22.000Z',
  status,
});

const statesOf = (status: OrderStatus, fillQuantity?: string) => orderSteps(orderWith(status, fillQuantity)).map((step) => `${step.label}:${step.state}`);

describe('Order steps', () => {
  test('Should place a live order on its step from the status alone', () => {
    expect(statesOf('pending')).toEqual(['Recebida:done', 'Saldo reservado:current', 'No livro:upcoming', 'Executada:upcoming']);
    expect(statesOf('open')).toEqual(['Recebida:done', 'Saldo reservado:done', 'No livro:current', 'Executada:upcoming']);
    expect(statesOf('partiallyFilled', '5')).toEqual(['Recebida:done', 'Saldo reservado:done', 'No livro, executada em parte:current', 'Executada:upcoming']);
  });

  test('Should end a filled order in success', () => {
    const steps = orderSteps(orderWith('filled', '10'));
    expect(steps.every((step) => step.state === 'done')).toBe(true);
    expect(steps.at(-1)).toEqual({ key: 'outcome', label: 'Executada', state: 'done', tone: 'success' });
  });

  test('Should end a rejected order at the reservation and never on the book', () => {
    expect(statesOf('rejected')).toEqual(['Recebida:done', 'Saldo reservado:failed', 'No livro:skipped', 'Rejeitada:failed']);
    expect(orderSteps(orderWith('rejected')).at(-1)?.tone).toBe('danger');
  });

  test('Should not claim a cancelled order reached the book unless something filled', () => {
    expect(statesOf('cancelled')).toEqual(['Recebida:done', 'Saldo reservado:unknown', 'No livro:unknown', 'Cancelada:done']);
    expect(statesOf('cancelled', '2')).toEqual(['Recebida:done', 'Saldo reservado:done', 'No livro:done', 'Cancelada:done']);
    expect(statesOf('cancelling')).toEqual(['Recebida:done', 'Saldo reservado:unknown', 'No livro:unknown', 'Cancelando:current']);
    expect(statesOf('expired')).toEqual(['Recebida:done', 'Saldo reservado:unknown', 'No livro:unknown', 'Expirada:failed']);
  });
});

describe('Order list figures', () => {
  test('Should count the orders each filter shows', () => {
    const all: readonly OrderStatus[] = ['pending', 'open', 'partiallyFilled', 'filled', 'cancelling', 'cancelled', 'rejected', 'expired'];
    expect(filterCounts(all.map((status) => orderWith(status)))).toEqual({ all: 8, open: 4, filled: 1, closed: 3 });
    expect(filterCounts([])).toEqual({ all: 0, open: 0, filled: 0, closed: 0 });
  });

  test('Should mark only the statuses that can still change as live', () => {
    expect(['pending', 'open', 'partiallyFilled', 'cancelling', 'filled', 'cancelled'].filter((status) => isLive(status as OrderStatus))).toEqual(['pending', 'open', 'partiallyFilled', 'cancelling']);
  });

  test('Should price the whole order at its limit', () => {
    expect(orderNotional({ price: '83000.10', quantity: '0.1' })).toBe('8300.01');
  });
});
