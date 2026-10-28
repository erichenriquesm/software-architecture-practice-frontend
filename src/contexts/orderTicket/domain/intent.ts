import type { TicketOrder } from './ticket';

/** One user intent: the order the user confirmed and the Idempotency-Key that travels with every attempt of it. */
export interface OrderIntent {
  readonly order: TicketOrder;
  readonly idempotencyKey: string;
}

const sameOrder = (first: TicketOrder, second: TicketOrder): boolean => first.side === second.side && first.price === second.price && first.quantity === second.quantity;

/**
 * Confirming the same order again after a failure that may not have reached the book is the same intent,
 * so the key is reused and the backend can never place it twice; anything else is a new intent.
 */
export const intentFor = (order: TicketOrder, unfinished: OrderIntent | undefined, newKey: () => string): OrderIntent => {
  if (unfinished && sameOrder(unfinished.order, order)) return unfinished;
  return { order, idempotencyKey: newKey() };
};
