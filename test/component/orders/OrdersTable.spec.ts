import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { OrdersTable } from '@/contexts/orders';
import type { OrderResponse } from '@/contexts/orders/infra/orders.api';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';
import { accountId, fastOrdersApi, heightForRows, layoutOrdersBody, orderResponse } from './support';

const open = orderResponse('o-open', { status: 'open', price: '82900.00', quantity: '0.50000000' });
const partial = orderResponse('o-partial', { status: 'partiallyFilled', fillQuantity: '5.00000000', fillPrice: '83000.00000000' });
const filled = orderResponse('o-filled', { side: 'sell', status: 'filled', fillQuantity: '10.00000000', fillPrice: '83000.00000000' });
const rejected = orderResponse('o-rejected', { status: 'rejected', statusReason: 'INSUFFICIENT_FUNDS' });

const serveOrders = (current: () => readonly OrderResponse[]) => server.use(http.get(`/accounts/${accountId}/orders`, () => HttpResponse.json(current())));

const rows = () => screen.getAllByRole('row').slice(1);

let layout: ReturnType<typeof layoutOrdersBody>;
beforeEach(() => {
  layout = layoutOrdersBody(heightForRows(20));
});
afterEach(() => layout.restore());

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

    await fireEvent.click(screen.getByRole('button', { name: /^Abertas/ }));
    expect(rows()).toHaveLength(2);
    expect(screen.getByRole('button', { name: /^Abertas/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^Todas/ }).getAttribute('aria-pressed')).toBe('false');

    await fireEvent.click(screen.getByRole('button', { name: /^Canceladas e rejeitadas/ }));
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('Rejeitada')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: /^Executadas/ }));
    expect(rows()).toHaveLength(1);
  });

  test('Should count the orders of each filter on its chip', async () => {
    serveOrders(() => [open, partial, filled, rejected]);
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });
    await screen.findByText('Parcial');

    expect(screen.getByRole('button', { name: /^Todas\s*, 4 ordens$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Abertas\s*, 2 ordens$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Executadas\s*, 1 ordem$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Canceladas e rejeitadas\s*, 1 ordem$/ })).toBeTruthy();
  });

  test('Should say there is nothing in a filter and offer to show every order again', async () => {
    serveOrders(() => [filled]);
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });
    await screen.findByText('Executada');

    await fireEvent.click(screen.getByRole('button', { name: /^Abertas/ }));

    expect(screen.getByText('Nenhuma ordem com esse status')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Ver todas as ordens' }));

    expect(rows()).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^Todas/ }).getAttribute('aria-pressed')).toBe('true');
  });

  test('Should point a new account to the market', async () => {
    serveOrders(() => []);
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });

    expect(await screen.findByText('Nenhuma ordem ainda')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Ir para o mercado' }).getAttribute('href')).toBe('/'));
  });

  test('Should offer to retry when the list cannot be loaded', async () => {
    let fail = true;
    server.use(http.get(`/accounts/${accountId}/orders`, () => (fail ? HttpResponse.json({ error: 'orderServiceUnavailable' }, { status: 503 }) : HttpResponse.json([open]))));
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });

    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar as ordens.');
    fail = false;
    await fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Aberta')).toBeTruthy();
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

describe('Orders table pagination', () => {
  const many = Array.from({ length: 5 }, (_, index) =>
    orderResponse(`o-${index}`, { status: index < 3 ? 'open' : 'filled', price: `8300${index}.00`, timestamp: `2026-10-28T13:4${9 - index}:00.000Z` }),
  );
  const range = () => screen.getByRole('navigation', { name: 'Páginas de ordens' }).querySelector('.orders-range')?.textContent;
  const next = () => screen.getByRole('button', { name: 'Próxima página' });
  const previous = () => screen.getByRole('button', { name: 'Página anterior' });

  test('Should show only the rows that fit and page through the rest', async () => {
    layout.resize(heightForRows(2));
    serveOrders(() => many);
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });
    await screen.findAllByText('Aberta');

    expect(rows()).toHaveLength(2);
    expect(range()).toBe('1–2 de 5');
    expect((previous() as HTMLButtonElement).disabled).toBe(true);

    await fireEvent.click(next());
    expect(range()).toBe('3–4 de 5');
    expect(rows()[0]?.textContent).toContain('83.002,00');

    await fireEvent.click(next());
    expect(range()).toBe('5–5 de 5');
    expect(rows()).toHaveLength(1);
    expect((next() as HTMLButtonElement).disabled).toBe(true);

    await fireEvent.click(previous());
    expect(range()).toBe('3–4 de 5');
  });

  test('Should take its page size from the space available and follow a resize', async () => {
    layout.resize(heightForRows(3) + 20);
    serveOrders(() => many);
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });
    await screen.findAllByText('Aberta');
    expect(rows()).toHaveLength(3);

    layout.resize(heightForRows(4));
    await waitFor(() => expect(rows()).toHaveLength(4));
    expect(range()).toBe('1–4 de 5');
  });

  test('Should go back to the first page when the filter changes', async () => {
    layout.resize(heightForRows(2));
    serveOrders(() => many);
    await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });
    await screen.findAllByText('Aberta');
    await fireEvent.click(next());
    expect(range()).toBe('3–4 de 5');

    await fireEvent.click(screen.getByRole('button', { name: /^Abertas/ }));

    expect(range()).toBe('1–2 de 3');
  });

  test('Should clamp to the last page when the list shrinks under it', async () => {
    layout.resize(heightForRows(2));
    let current: readonly OrderResponse[] = many;
    serveOrders(() => current);
    const { queryClient } = await renderWithApp(OrdersTable, { props: { accountId }, provide: fastOrdersApi });
    await screen.findAllByText('Aberta');
    await fireEvent.click(next());
    await fireEvent.click(next());
    expect(range()).toBe('5–5 de 5');

    current = many.slice(0, 3);
    await queryClient.invalidateQueries();

    await waitFor(() => expect(range()).toBe('3–3 de 3'));
    expect(rows()).toHaveLength(1);
  });
});
