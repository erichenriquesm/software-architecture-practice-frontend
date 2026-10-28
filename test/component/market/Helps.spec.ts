import { fireEvent, screen } from '@testing-library/vue';
import { describe, expect, test } from 'vitest';
import { MarketHeader, OrderBookPanel } from '@/contexts/market';
import { OrderTicket, orderTicketApiKey } from '@/contexts/orderTicket';
import { createOrderTicketApi } from '@/contexts/orderTicket/infra/orderTicket.api';
import { marketOf } from '@/entities/market';
import { createHttpClient } from '@/shared/api/httpClient';
import { renderWithApp } from '../../support/renderWithApp';
import { useFakeLayout } from './fitStub';

const market = marketOf('BTC-USD')!;
const helpFor = (term: string) => screen.getByRole('button', { name: `O que é ${term}?` });

describe('Help bubbles on the market screen', () => {
  useFakeLayout(600);

  test('Should explain every figure of the ticker strip', async () => {
    await renderWithApp(MarketHeader, { props: { market, lastPrice: '84000.00', trades: [], summary: { min: '80000.00', max: '84000.00', volume: '16400.00', spread: '100.00' } } });

    for (const term of ['Último preço', 'Faixa 24h', 'Volume 24h', 'Spread']) expect(helpFor(term)).toBeTruthy();
    await fireEvent.mouseEnter(helpFor('Spread').parentElement as HTMLElement);

    expect(screen.getByRole('tooltip').textContent).toContain('A diferença entre a venda mais barata e a compra mais cara no livro.');
  });

  test('Should explain the book and its grouping while the select keeps its label', async () => {
    await renderWithApp(OrderBookPanel, { props: { market, bids: [], asks: [], precision: 2 } });

    expect(helpFor('Livro de ofertas')).toBeTruthy();
    expect(helpFor('Agrupar')).toBeTruthy();
    expect(screen.getByLabelText('Agrupar').tagName).toBe('SELECT');
    expect(screen.getByRole('heading', { name: 'Livro de ofertas' })).toBeTruthy();
  });

  test('Should explain each part of the ticket without taking the fields their names', async () => {
    const api = createOrderTicketApi(createHttpClient({ sleep: async () => undefined }));
    await renderWithApp(OrderTicket, { props: { market, available: { USD: '59100.00', BTC: '1.25' } }, provide: { [orderTicketApiKey as symbol]: api } });

    for (const term of ['Ordem limitada', 'Preço limite', 'Quantidade', 'Total', 'Fica reservado']) expect(helpFor(term)).toBeTruthy();
    expect(screen.getByLabelText('Preço limite').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Quantidade').tagName).toBe('INPUT');
    await fireEvent.click(helpFor('Preço limite'));

    expect(screen.getByRole('tooltip').textContent).toContain('o máximo que você paga por 1 BTC');
  });
});
