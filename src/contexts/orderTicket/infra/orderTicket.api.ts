import type { OrderStatus, Side } from '@/entities/order';
import type { HttpClient } from '@/shared/api/httpClient';

export interface PlaceOrderRequest {
  readonly marketId: string;
  readonly side: Side;
  readonly quantity: string;
  readonly price: string;
}

export interface PlaceOrderResponse {
  readonly orderId: string;
  readonly status: OrderStatus;
}

/** Only what the ticket needs from GET /orders/:orderId to tell the user whether the order was accepted. */
export interface PlacedOrderResponse {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly statusReason: string | null;
}

export interface OrderTicketApi {
  placeOrder(request: PlaceOrderRequest, idempotencyKey: string): Promise<PlaceOrderResponse>;
  order(orderId: string): Promise<PlacedOrderResponse>;
}

export const createOrderTicketApi = (http: HttpClient): OrderTicketApi => ({
  placeOrder: (request, idempotencyKey) => http.post<PlaceOrderResponse>('/place_order', { body: request, idempotencyKey }),
  order: (orderId) => http.get<PlacedOrderResponse>(`/orders/${encodeURIComponent(orderId)}`),
});
