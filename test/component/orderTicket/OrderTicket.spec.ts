import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
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
});
