import { waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { defineComponent } from 'vue';
import { orderTicketApiKey } from '@/contexts/orderTicket';
import type { OrderTicketApi } from '@/contexts/orderTicket';
import { useOrderTicket } from '@/contexts/orderTicket/application/useOrderTicket';
import { marketOf } from '@/entities/market';
import { ApiError } from '@/shared/api/apiError';
import { renderWithApp } from '../../../support/renderWithApp';

const market = marketOf('BTC-USD')!;
type Outcome = { orderId: string } | ApiError;

/** In-memory API: each place_order call takes the next outcome and records the Idempotency-Key it got. */
const fakeApi = (...outcomes: Outcome[]) => {
  const keys: string[] = [];
  const api: OrderTicketApi = {
    placeOrder: async (_request, idempotencyKey) => {
      keys.push(idempotencyKey);
      const next = outcomes.shift() ?? { orderId: 'order-1' };
      if (next instanceof ApiError) throw next;
      return { orderId: next.orderId, status: 'pending' };
    },
    order: async (orderId) => ({ orderId, status: 'open', statusReason: null }),
  };
  return { api, keys };
};

const mountTicket = async (api: OrderTicketApi) => {
  let ticket: ReturnType<typeof useOrderTicket> | undefined;
  const placed: string[] = [];
  const Harness = defineComponent({
    setup() {
      ticket = useOrderTicket({ market, available: () => ({ USD: '100000', BTC: '2' }), onPlaced: (orderId) => placed.push(orderId) });
      return () => null;
    },
  });
  await renderWithApp(Harness, { provide: { [orderTicketApiKey as symbol]: api } });
  return { ticket: ticket!, placed };
};

const send = (ticket: ReturnType<typeof useOrderTicket>, price: string, quantity: string) => {
  ticket.form.values.price = price;
  ticket.form.values.quantity = quantity;
  ticket.review();
  ticket.confirm();
};

const unavailable = () => new ApiError(503, 'serviceUnavailable', 'down');

afterEach(() => vi.useRealTimers());

describe('Order ticket use case', () => {
  test('Should ask for confirmation before sending anything', async () => {
    const { api, keys } = fakeApi();
    const { ticket } = await mountTicket(api);

    ticket.form.values.price = '83000,00';
    ticket.form.values.quantity = '0,5';
    ticket.review();

    expect(ticket.step.value).toBe('confirming');
    expect(ticket.draft.value).toEqual({ side: 'buy', price: '83000.00', quantity: '0.5' });
    expect(keys).toHaveLength(0);
  });

  test('Should send the same Idempotency-Key when the same order is confirmed again after a failure', async () => {
    // Given
    const { api, keys } = fakeApi(unavailable(), { orderId: 'order-7' });
    const { ticket, placed } = await mountTicket(api);

    // When
    send(ticket, '83000,00', '0,5');
    await waitFor(() => expect(ticket.errorMessage.value?.title).toBe('O envio de ordens está indisponível agora.'));
    send(ticket, '83000,00', '0,5');

    // Then
    await waitFor(() => expect(placed).toEqual(['order-7']));
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  test('Should use a new key for a new intent', async () => {
    const { api, keys } = fakeApi({ orderId: 'order-1' }, unavailable(), { orderId: 'order-3' });
    const { ticket, placed } = await mountTicket(api);

    send(ticket, '83000,00', '0,5');
    await waitFor(() => expect(placed).toEqual(['order-1']));
    send(ticket, '83000,00', '0,5');
    await waitFor(() => expect(ticket.errorMessage.value).toBeDefined());
    send(ticket, '83000,00', '0,6');
    await waitFor(() => expect(placed).toEqual(['order-1', 'order-3']));

    expect(new Set(keys).size).toBe(3);
  });

  test('Should never reuse the key of an order the backend refused', async () => {
    const { api, keys } = fakeApi(new ApiError(422, 'invalidOrderData', 'price: must be a positive decimal string'), { orderId: 'order-2' });
    const { ticket, placed } = await mountTicket(api);

    send(ticket, '83000,00', '0,5');
    await waitFor(() => expect(ticket.errorMessage.value?.detail).toBe('Informe um preço maior que zero, com no máximo 2 casas decimais.'));
    send(ticket, '83000,00', '0,5');
    await waitFor(() => expect(placed).toEqual(['order-2']));

    expect(keys[1]).not.toBe(keys[0]);
  });

  test('Should count down the Retry-After of a 429 and block sending until it ends', async () => {
    // Given
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const { api, keys } = fakeApi(new ApiError(429, 'tooManyRequests', 'slow down', 3));
    const { ticket } = await mountTicket(api);

    // When
    send(ticket, '83000,00', '0,5');
    await flushPromises();

    // Then
    expect(ticket.blocked.value).toBe(true);
    expect(ticket.errorMessage.value?.detail).toBe('Você pode enviar de novo em 3 s. Nada foi enviado duas vezes.');
    ticket.review();
    expect(ticket.step.value).toBe('editing');
    vi.advanceTimersByTime(1_000);
    expect(ticket.secondsLeft.value).toBe(2);
    vi.advanceTimersByTime(2_000);
    expect(ticket.blocked.value).toBe(false);
    send(ticket, '83000,00', '0,5');
    await flushPromises();
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });
});
