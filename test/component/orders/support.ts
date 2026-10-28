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
