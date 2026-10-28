import { describe, expect, test } from 'vitest';
import { createTicketSchema, orderTotal, reservationOf } from '@/contexts/orderTicket/domain/ticket';
import type { AvailableOf } from '@/contexts/orderTicket/domain/ticket';
import { marketOf } from '@/entities/market';

const market = marketOf('BTC-USD')!;
const plenty: AvailableOf = () => '1000000';

const issuesOf = (values: { side?: 'buy' | 'sell'; price: string; quantity: string }, availableOf: AvailableOf = plenty) => {
  const result = createTicketSchema(market, availableOf).safeParse({ side: 'buy', ...values });
  if (result.success) return {};
  const firstByField: Record<string, string> = {};
  for (const issue of result.error.issues) firstByField[String(issue.path[0])] ??= issue.message;
  return firstByField;
};

describe('Order ticket rules', () => {
  test('Should accept a comma decimal and send it normalized', () => {
    const result = createTicketSchema(market, plenty).safeParse({ side: 'buy', price: '83.000,00', quantity: '0,5' });

    expect(result.success && result.data).toEqual({ side: 'buy', price: '83000.00', quantity: '0.5' });
  });

  test('Should ask for both amounts and accept only numbers', () => {
    expect(issuesOf({ price: '', quantity: '' })).toEqual({ price: 'Informe o preço limite.', quantity: 'Informe a quantidade.' });
    expect(issuesOf({ price: 'abc', quantity: '1' }).price).toBe('Use só números, como 83000,00.');
    expect(issuesOf({ price: '0', quantity: '1' }).price).toBe('O preço precisa ser maior que zero.');
  });

  test('Should keep the price on the 0.01 tick', () => {
    expect(issuesOf({ price: '83000,005', quantity: '0,5' }).price).toBe('Use um preço múltiplo de 0,01 USD.');
    expect(issuesOf({ price: '83000,01', quantity: '0,5' })).toEqual({});
  });

  test('Should keep the quantity on the 0.00001 step', () => {
    expect(issuesOf({ price: '83000', quantity: '0,000015' }).quantity).toBe('Use uma quantidade múltipla de 0,00001 BTC.');
    expect(issuesOf({ price: '83000', quantity: '0,00001' }).quantity).toBe('O total precisa ser de ao menos 5,00 USD.');
  });

  test('Should require a total of at least 5 USD', () => {
    expect(issuesOf({ price: '4,99', quantity: '1' }).quantity).toBe('O total precisa ser de ao menos 5,00 USD.');
    expect(issuesOf({ price: '5', quantity: '1' })).toEqual({});
  });

  test('Should not let a buy reserve more USD than is available', () => {
    const availableOf: AvailableOf = (assetId) => (assetId === 'USD' ? '41499.99' : '10');

    expect(issuesOf({ price: '83000', quantity: '0,5' }, availableOf).quantity).toBe('Saldo insuficiente: disponível 41.499,99 USD.');
    expect(issuesOf({ price: '82999,98', quantity: '0,5' }, availableOf)).toEqual({});
  });

  test('Should not let a sell reserve more BTC than is available', () => {
    const availableOf: AvailableOf = (assetId) => (assetId === 'BTC' ? '0.4' : '0');

    expect(issuesOf({ side: 'sell', price: '83000', quantity: '0,5' }, availableOf).quantity).toBe('Saldo insuficiente: disponível 0,40000000 BTC.');
    expect(issuesOf({ side: 'sell', price: '83000', quantity: '0,4' }, availableOf)).toEqual({});
  });

  test('Should not block anything while the balance is unknown', () => {
    expect(issuesOf({ price: '83000', quantity: '100' }, () => undefined)).toEqual({});
  });

  test('Should compute the total exactly and reserve the quote on a buy, the base on a sell', () => {
    expect(orderTotal('0,1', '0,2')).toBe('0.02');
    expect(orderTotal('83.000,00', '')).toBeUndefined();
    expect(reservationOf(market, 'buy', '83000,00', '0,5')).toEqual({ assetId: 'USD', amount: '41500' });
    expect(reservationOf(market, 'sell', '83000,00', '0,5')).toEqual({ assetId: 'BTC', amount: '0.5' });
  });
});
