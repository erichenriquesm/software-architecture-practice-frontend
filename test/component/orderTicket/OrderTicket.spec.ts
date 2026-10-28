import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { OrderBookPanel } from '@/contexts/market';
import { OrderTicket, orderTicketApiKey } from '@/contexts/orderTicket';
import { createOrderTicketApi } from '@/contexts/orderTicket/infra/orderTicket.api';
import { marketOf } from '@/entities/market';
import { createHttpClient } from '@/shared/api/httpClient';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';

const market = marketOf('BTC-USD')!;
const orderId = '0199d5f4-2b9a-7c3e-9a51-2f1d3c4b5a70';

/** The real HTTP client and its retries, without the waiting between attempts. */
const api = createOrderTicketApi(createHttpClient({ sleep: async () => undefined }));

const renderTicket = (available: Record<string, string> = { USD: '59100.00', BTC: '1.25' }) =>
  renderWithApp(OrderTicket, { props: { market, available, bestAsk: '83100.00', bestBid: '83000.00' }, provide: { [orderTicketApiKey as symbol]: api } });

const fillOrder = async (price: string, quantity: string) => {
  await fireEvent.update(screen.getByLabelText('Preço limite'), price);
  await fireEvent.update(screen.getByLabelText('Quantidade'), quantity);
};

const openConfirmation = async () => {
  await fireEvent.click(screen.getByRole('button', { name: 'Comprar BTC' }));
  return screen.findByRole('dialog', { name: 'Confirmar compra' });
};

describe('Order ticket', () => {
  test('Should show the total, what stays reserved and the free balance for the chosen side', async () => {
    await renderTicket();

    await fillOrder('83000,00', '0,5');

    expect(screen.getByText('Total').nextElementSibling?.textContent).toContain('41.500,00');
    expect(screen.getByText('Fica reservado').nextElementSibling?.textContent).toBe('41.500,00 USD');
    expect(screen.getByText('Disponível: 59.100,00 USD')).toBeTruthy();
    expect(screen.getByText('Melhor venda: 83.100,00')).toBeTruthy();
    expect(screen.getByText('Usa 70% do disponível')).toBeTruthy();

    await fireEvent.click(screen.getByRole('radio', { name: 'Venda' }));

    expect(screen.getByText('Fica reservado').nextElementSibling?.textContent).toBe('0,50000000 BTC');
    expect(screen.getByRole('button', { name: 'Vender BTC' })).toBeTruthy();
    expect(screen.getByText('Melhor compra: 83.000,00')).toBeTruthy();
  });

  test('Should keep an order that exceeds the free balance from reaching the confirmation', async () => {
    await renderTicket({ USD: '17600.00', BTC: '0' });

    await fillOrder('83000,00', '0,5');
    await fireEvent.click(screen.getByRole('button', { name: 'Comprar BTC' }));

    expect(screen.getByText('Saldo insuficiente: disponível 17.600,00 USD.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('Should review in a modal dialog that takes focus and closes on Escape without sending', async () => {
    // Given
    await renderTicket();
    await fillOrder('83000,00', '0,5');

    // When
    const dialog = await openConfirmation();

    // Then
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(within(dialog).getByText(/Compra limitada/).textContent).toContain('▲');
    expect(within(dialog).getByText('83.000,00 USD')).toBeTruthy();
    expect(within(dialog).getByText('41.500,00 USD')).toBeTruthy();
    expect(within(dialog).getByText(/a diferença volta para o seu saldo disponível/)).toBeTruthy();

    await fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Comprar BTC' })));
  });

  test('Should go back from the dialog with Voltar', async () => {
    await renderTicket();
    await fillOrder('83000,00', '0,5');
    const dialog = await openConfirmation();

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Voltar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('Should send once on confirmation, say the order is in the book and link to it', async () => {
    // Given
    const requests: Array<{ body: unknown; key: string | null }> = [];
    server.use(
      http.post('/place_order', async ({ request }) => {
        requests.push({ body: await request.json(), key: request.headers.get('idempotency-key') });
        return HttpResponse.json({ orderId, status: 'pending' }, { status: 202 });
      }),
      http.get(`/orders/${orderId}`, () => HttpResponse.json({ orderId, status: 'open', statusReason: null })),
    );
    const { emitted } = await renderTicket();
    await fillOrder('83.000,00', '0,5');

    // When
    const dialog = await openConfirmation();
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Comprar BTC' }));

    // Then
    expect(await screen.findByText('Sua ordem entrou no livro.')).toBeTruthy();
    expect(screen.getByText('Compra de 0,50000000 BTC a 83.000,00 USD.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver ordem' }).getAttribute('href')).toBe(`/ordens/${orderId}`);
    expect(requests).toEqual([{ body: { marketId: 'BTC-USD', side: 'buy', price: '83000.00', quantity: '0.5' }, key: expect.stringMatching(/^[0-9a-f-]{36}$/) }]);
    expect(emitted().placed).toEqual([[orderId]]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('Should tell the user when the order is rejected later for lack of funds', async () => {
    server.use(
      http.post('/place_order', () => HttpResponse.json({ orderId, status: 'pending' }, { status: 202 })),
      http.get(`/orders/${orderId}`, () => HttpResponse.json({ orderId, status: 'rejected', statusReason: 'INSUFFICIENT_FUNDS' })),
    );
    await renderTicket();
    await fillOrder('83000,00', '0,5');

    const dialog = await openConfirmation();
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Comprar BTC' }));

    expect((await screen.findByRole('alert')).textContent).toContain('A ordem foi rejeitada por saldo insuficiente.');
  });

  test('Should show the backend message above the form when the order is refused', async () => {
    server.use(http.post('/place_order', () => HttpResponse.json({ error: 'invalidOrderData', message: 'price: must be a multiple of 0.01' }, { status: 422 })));
    await renderTicket();
    await fillOrder('83000,00', '0,5');

    const dialog = await openConfirmation();
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Comprar BTC' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('A ordem não foi aceita.');
    expect(alert.textContent).toContain('price: must be a multiple of 0.01');
  });

  test('Should retry a 429 with the same key, then count down and disable sending', async () => {
    // Given
    const keys: Array<string | null> = [];
    server.use(
      http.post('/place_order', ({ request }) => {
        keys.push(request.headers.get('idempotency-key'));
        return HttpResponse.json({ error: 'tooManyRequests', message: 'slow down' }, { status: 429, headers: { 'retry-after': '8' } });
      }),
    );
    await renderTicket();
    await fillOrder('83000,00', '0,5');

    // When
    const dialog = await openConfirmation();
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Comprar BTC' }));

    // Then
    expect(await screen.findByText('Muitas ordens em pouco tempo.')).toBeTruthy();
    expect(screen.getByText(/Você pode enviar de novo em 8 s/)).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Comprar BTC em 8 s' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(1);
  });

  test('Should say the service is unavailable on a 503', async () => {
    server.use(http.post('/place_order', () => HttpResponse.json({ error: 'serviceUnavailable' }, { status: 503 })));
    await renderTicket();
    await fillOrder('83000,00', '0,5');

    const dialog = await openConfirmation();
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Comprar BTC' }));

    expect((await screen.findByRole('alert')).textContent).toContain('O envio de ordens está indisponível agora.');
  });

  test('Should fill the quantity from a share of the free balance, rounded down to the step', async () => {
    // Given
    await renderTicket({ USD: '6792.50', BTC: '1.25' });
    const shares = screen.getByRole('group', { name: 'Preencher com parte do disponível' });
    expect((within(shares).getByRole('button', { name: '50%' }) as HTMLButtonElement).disabled).toBe(true);

    // When
    await fireEvent.update(screen.getByLabelText('Preço limite'), '83000,00');
    await fireEvent.click(within(shares).getByRole('button', { name: '50%' }));

    // Then
    expect((screen.getByLabelText('Quantidade') as HTMLInputElement).value).toBe('0,04091');
    expect(within(shares).getByRole('button', { name: '50%' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Usa 50% do disponível')).toBeTruthy();

    await fireEvent.click(screen.getByRole('radio', { name: 'Venda' }));
    await fireEvent.click(within(shares).getByRole('button', { name: 'Máx' }));

    expect((screen.getByLabelText('Quantidade') as HTMLInputElement).value).toBe('1,25000');
    expect(screen.getByText('Usa 100% do disponível')).toBeTruthy();
  });

  test('Should warn on the usage bar when the order needs more than is free', async () => {
    await renderTicket({ USD: '17600.00', BTC: '0' });

    await fillOrder('83000,00', '0,5');

    expect(screen.getByText('Acima do disponível')).toBeTruthy();
  });

  test('Should use the best price of the other side with one click', async () => {
    await renderTicket();

    await fireEvent.click(screen.getByRole('button', { name: 'Usar melhor preço' }));
    expect((screen.getByLabelText('Preço limite') as HTMLInputElement).value).toBe('83.100,00');

    await fireEvent.click(screen.getByRole('radio', { name: 'Venda' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Usar melhor preço' }));
    expect((screen.getByLabelText('Preço limite') as HTMLInputElement).value).toBe('83.000,00');
  });

  test('Should take a price clicked in the order book as the limit price, as the market page wires them', async () => {
    // Given: the same wiring as the market page, the book's pick goes to the ticket's setPrice
    const Market = defineComponent({
      setup() {
        const ticket = ref<InstanceType<typeof OrderTicket>>();
        return () => [
          h(OrderBookPanel, {
            market,
            precision: 2,
            bids: [{ price: '83000.00', quantity: '5' }],
            asks: [{ price: '83100.00', quantity: '1.4' }],
            onPick: (price: string) => ticket.value?.setPrice(price),
          }),
          h(OrderTicket, { ref: ticket, market, available: { USD: '59100.00', BTC: '1.25' } }),
        ];
      },
    });
    await renderWithApp(Market, { provide: { [orderTicketApiKey as symbol]: api } });

    // When
    await fireEvent.click(screen.getByRole('button', { name: 'Usar o preço 83.000,00' }));

    // Then
    expect((screen.getByLabelText('Preço limite') as HTMLInputElement).value).toBe('83.000,00');
    expect(screen.getByText('Preço limite 83.000,00 USD')).toBeTruthy();
  });
});
