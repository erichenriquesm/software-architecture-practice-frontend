import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { OrdersTable } from '@/contexts/orders';
import type { OrderResponse } from '@/contexts/orders/infra/orders.api';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';
import { accountId, fastOrdersApi, orderResponse } from './support';

const open = orderResponse('o-open', { status: 'open', price: '82900.00', quantity: '0.50000000' });
const partial = orderResponse('o-partial', { status: 'partiallyFilled', fillQuantity: '5.00000000', fillPrice: '83000.00000000' });
const filled = orderResponse('o-filled', { side: 'sell', status: 'filled', fillQuantity: '10.00000000', fillPrice: '83000.00000000' });
const rejected = orderResponse('o-rejected', { status: 'rejected', statusReason: 'INSUFFICIENT_FUNDS' });

const serveOrders = (current: () => readonly OrderResponse[]) => server.use(http.get(`/accounts/${accountId}/orders`, () => HttpResponse.json(current())));

const rows = () => screen.getAllByRole('row').slice(1);

describe('Orders table', () => {
  test('Should list the orders with side, amounts and status, linking each one to its detail', async () => {
    serveOrders(() => [open, partial, filled, rejected]);
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });

    await screen.findByText('Parcial');
    const [first, second, third] = rows();

    expect(first?.textContent).toContain('▲ Compra');
    expect(first?.textContent).toContain('82.900,00');
    expect(first?.textContent).toContain('0,50000000');
    expect(second?.textContent).toContain('5,00000000');
    expect(second?.textContent).toContain('83.000,00');
    expect(third?.textContent).toContain('▼ Venda');
    expect(within(first!).getByRole('link').getAttribute('href')).toBe('/ordens/o-open');
    expect(screen.getAllByRole('button', { name: /^Cancelar ordem/ })).toHaveLength(2);
  });

  test('Should filter by status group and say when a group is empty', async () => {
    serveOrders(() => [open, partial, filled, rejected]);
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });
    await screen.findByText('Parcial');

    await fireEvent.click(screen.getByRole('button', { name: 'Abertas' }));
    expect(rows()).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Abertas' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Todas' }).getAttribute('aria-pressed')).toBe('false');

    await fireEvent.click(screen.getByRole('button', { name: 'Canceladas e rejeitadas' }));
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('Rejeitada')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Executadas' }));
    expect(rows()).toHaveLength(1);
  });

  test('Should say there is nothing in a filter', async () => {
    serveOrders(() => [filled]);
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });
    await screen.findByText('Executada');

    await fireEvent.click(screen.getByRole('button', { name: 'Abertas' }));

    expect(screen.getByText('Nenhuma ordem com esse status')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  test('Should cancel an order with an Idempotency-Key and show the new status', async () => {
    let current: readonly OrderResponse[] = [open];
    serveOrders(() => current);
    const requests: { key: string | null; body: unknown }[] = [];
    server.use(
      http.post('/cancel_order', async ({ request }) => {
        requests.push({ key: request.headers.get('idempotency-key'), body: await request.json() });
        current = [{ ...open, status: 'cancelling' }];
        return HttpResponse.json({ orderId: open.orderId, status: 'cancelling' }, { status: 202 });
      }),
    );
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });

    await fireEvent.click(await screen.findByRole('button', { name: /^Cancelar ordem de compra/ }));

    expect(await screen.findByText('Cancelando')).toBeTruthy();
    expect(requests).toEqual([{ key: expect.stringMatching(/^[0-9a-f-]{36}$/), body: { orderId: 'o-open' } }]);
    expect(screen.queryByRole('button', { name: /^Cancelar ordem/ })).toBeNull();
  });

  test('Should explain a cancel that came too late and refresh the list', async () => {
    let current: readonly OrderResponse[] = [open];
    serveOrders(() => current);
    server.use(
      http.post('/cancel_order', () => {
        current = [{ ...open, status: 'filled', fillQuantity: open.quantity, fillPrice: '82900.00000000' }];
        return HttpResponse.json({ error: 'invalidOrderTransition' }, { status: 409 });
      }),
    );
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });

    await fireEvent.click(await screen.findByRole('button', { name: /^Cancelar ordem/ }));

    expect((await screen.findByRole('alert')).textContent).toContain('Esta ordem não pode mais ser cancelada.');
    await waitFor(() => expect(screen.getByText('Executada')).toBeTruthy());
  });
});
