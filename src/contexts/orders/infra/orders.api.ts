import type { OrderStatus, Side } from '@/entities/order';
import type { HttpClient } from '@/shared/api/httpClient';
import type { Order } from '../domain/order';

export interface OrderResponse {
  readonly orderId: string;
  readonly marketId: string;
  readonly side: Side;
  readonly quantity: string;
  readonly price: string;
  readonly fillQuantity: string;
  readonly fillPrice: string | null;
  readonly timestamp: string;
  readonly status: OrderStatus;
  readonly statusReason: string | null;
}

export interface CancelOrderRequest {
  readonly orderId: string;
}

export interface CancelOrderResponse {
  readonly orderId: string;
  readonly status: OrderStatus;
}

export interface OrdersApi {
  ordersOf(accountId: string): Promise<readonly Order[]>;
  order(orderId: string): Promise<Order>;
  cancel(request: CancelOrderRequest, idempotencyKey: string): Promise<CancelOrderResponse>;
}

export const toOrder = ({ timestamp, fillPrice, statusReason, ...order }: OrderResponse): Order => ({
  ...order,
  createdAt: timestamp,
  fillPrice: fillPrice ?? undefined,
  statusReason: statusReason ?? undefined,
});

export const createOrdersApi = (http: HttpClient): OrdersApi => ({
  ordersOf: async (accountId) => (await http.get<OrderResponse[]>(`/accounts/${encodeURIComponent(accountId)}/orders`)).map(toOrder),
  order: async (orderId) => toOrder(await http.get<OrderResponse>(`/orders/${encodeURIComponent(orderId)}`)),
  cancel: (request, idempotencyKey) => http.post<CancelOrderResponse>('/cancel_order', { body: request, idempotencyKey }),
});
