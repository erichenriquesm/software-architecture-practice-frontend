import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { OrderDetail } from '@/contexts/orders';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';
import { fastOrdersApi, orderResponse } from './support';

describe('Order detail', () => {
  test('Should show how much of a partial order was filled and offer to cancel the rest', async () => {
    const order = orderResponse('o-1', { status: 'partiallyFilled', fillQuantity: '5.00000000', fillPrice: '83000.00000000' });
    let cancelled = 0;
    server.use(
      http.get('/orders/o-1', () => HttpResponse.json(cancelled ? { ...order, status: 'cancelling' } : order)),
      http.post('/cancel_order', () => {
        cancelled += 1;
        return HttpResponse.json({ orderId: 'o-1', status: 'cancelling' }, { status: 202 });
      }),
    );
    await renderWithApp(OrderDetail, { props: { orderId: 'o-1' }, provide: fastOrdersApi });

    expect(await screen.findByRole('heading', { name: 'Compra de 10 BTC' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Execução da ordem' }).getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText('5,00000000 de 10,00000000 BTC · 50%')).toBeTruthy();
    expect(screen.getByText('415.000,00 USD')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Cancelar o restante' }));

    expect(await screen.findByText('Cancelamento pedido.')).toBeTruthy();
    expect(cancelled).toBe(1);
    expect(screen.queryByRole('button', { name: 'Cancelar o restante' })).toBeNull();
  });

  test('Should explain why a rejected order ended', async () => {
    server.use(http.get('/orders/o-2', () => HttpResponse.json(orderResponse('o-2', { status: 'rejected', statusReason: 'INSUFFICIENT_FUNDS' }))));
    await renderWithApp(OrderDetail, { props: { orderId: 'o-2' }, provide: fastOrdersApi });

    expect((await screen.findByRole('alert')).textContent).toContain('Não havia saldo disponível');
    expect(screen.queryByRole('button', { name: /Cancelar/ })).toBeNull();
  });

  test('Should show the not-found state when the order does not exist or belongs to someone else', async () => {
    server.use(http.get('/orders/missing', () => HttpResponse.json({ error: 'orderNotFound' }, { status: 404 })));
    await renderWithApp(OrderDetail, { props: { orderId: 'missing' }, provide: fastOrdersApi });

    expect(await screen.findByRole('heading', { name: 'Ordem não encontrada' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Ver minhas ordens' }).getAttribute('href')).toBe('/ordens'));
  });
});
