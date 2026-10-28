import { vi } from 'vitest';
import type { OrderResponse } from '@/contexts/orders/infra/orders.api';
import { ordersApiKey } from '@/contexts/orders';
import { createOrdersApi } from '@/contexts/orders/infra/orders.api';
import { createHttpClient } from '@/shared/api/httpClient';

export const accountId = '0199d5f4-2b9a-7c3e-9a51-2f1d3c4b5a69';

export const orderResponse = (orderId: string, changes: Partial<OrderResponse> = {}): OrderResponse => ({
  orderId,
  marketId: 'BTC-USD',
  side: 'buy',
  quantity: '10.00000000',
  price: '83000.00',
  fillQuantity: '0.00000000',
  fillPrice: null,
  timestamp: '2026-10-28T13:47:22.000Z',
  status: 'open',
  statusReason: null,
  ...changes,
});

export const fastOrdersApi = { [ordersApiKey]: createOrdersApi(createHttpClient({ sleep: () => Promise.resolve() })) };

/**
 * jsdom has no layout: this makes `.orders-body` report `heightPx` and drives the ResizeObserver behind useFitCount,
 * so a test decides how many rows fit. `resize` changes the height later, like a window resize.
 */
export const layoutOrdersBody = (heightPx: number) => {
  let height = heightPx;
  const observers: { callback: ResizeObserverCallback; observer: ResizeObserver }[] = [];
  class FakeResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe() {
      observers.push({ callback: this.callback, observer: this as unknown as ResizeObserver });
      this.callback([], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('orders-body') ? height : 0;
    },
  });
  return {
    resize: (next: number) => {
      height = next;
      for (const { callback, observer } of observers) callback([], observer);
    },
    restore: () => {
      vi.unstubAllGlobals();
      if (original) Object.defineProperty(HTMLElement.prototype, 'clientHeight', original);
    },
  };
};

/** Height of the table body that fits exactly `rows` rows (28px header, 45px per row). */
export const heightForRows = (rows: number) => 28 + rows * 45;
