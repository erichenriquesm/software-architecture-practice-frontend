import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';
import { defineComponent, h } from 'vue';
import { BalancesPanel, MovementPanel } from '@/contexts/wallet';
import { renderWithApp } from '../../support/renderWithApp';
import { server } from '../../support/server';
import { accountId, accountWith, fastWalletApi } from './support';

const balances = [
  { assetId: 'USD', available: '17600.00', reserved: '41500.00' },
  { assetId: 'BTC', available: '0.50000000', reserved: '0.00000000' },
];

const serveAccount = (current: () => typeof balances) => {
  let reads = 0;
  server.use(
    http.get(`/accounts/${accountId}`, () => {
      reads += 1;
      return HttpResponse.json(accountWith(current()));
    }),
  );
  return { reads: () => reads };
};

const recordKeys = (path: '/deposit' | '/withdraw', responses: readonly (() => Response)[]) => {
  const keys: (string | null)[] = [];
  const bodies: unknown[] = [];
  server.use(
    http.post(path, async ({ request }) => {
      keys.push(request.headers.get('idempotency-key'));
      bodies.push(await request.json());
      return (responses[keys.length - 1] ?? responses[responses.length - 1] ?? (() => new HttpResponse(null, { status: 204 })))();
    }),
  );
  return { keys, bodies };
};

const noContent = () => new HttpResponse(null, { status: 204 });

const send = async (quantity: string, button: string) => {
  await fireEvent.update(screen.getByLabelText('Quantidade'), quantity);
  await fireEvent.click(screen.getByRole('button', { name: button }));
};

describe('Movement panel', () => {
  test('Should deposit the typed amount, confirm it and refetch the balances', async () => {
    // Given
    let current = balances;
    const account = serveAccount(() => current);
    const deposits = recordKeys('/deposit', [noContent]);
    await renderWithApp(MovementPanel, { props: { accountId }, provide: fastWalletApi });
    await waitFor(() => expect(account.reads()).toBe(1));
    current = [{ ...balances[0]!, available: '19100.25' }, balances[1]!];

    // When
    await send('1.500,25', 'Depositar USD');

    // Then
    expect((await screen.findByRole('status')).textContent).toContain('1.500,25 USD entram no saldo em instantes.');
    expect(deposits.bodies).toEqual([{ assetId: 'USD', quantity: '1500.25' }]);
    await waitFor(() => expect(account.reads()).toBe(2));
  });

  test('Should show the new balance in the balances panel after a deposit', async () => {
    let current = [balances[0]!];
    serveAccount(() => current);
    recordKeys('/deposit', [noContent]);
    const walletPage = defineComponent({ setup: () => () => [h(BalancesPanel, { accountId }), h(MovementPanel, { accountId })] });
    await renderWithApp(walletPage, { provide: fastWalletApi });
    expect(await screen.findByText('17.600,00')).toBeTruthy();
    current = [{ ...balances[0]!, available: '17700.00' }];

    await send('100', 'Depositar USD');

    expect(await screen.findByText('17.700,00')).toBeTruthy();
  });

  test('Should send every retry of one click with the same Idempotency-Key, and a new key on the next click', async () => {
    serveAccount(() => balances);
    const deposits = recordKeys('/deposit', [() => HttpResponse.json({ error: 'accountServiceUnavailable' }, { status: 503 }), noContent, noContent]);
    await renderWithApp(MovementPanel, { props: { accountId }, provide: fastWalletApi });

    await send('10', 'Depositar USD');
    await screen.findByRole('status');
    await send('20', 'Depositar USD');
    await waitFor(() => expect(deposits.keys).toHaveLength(3));

    const [first, retry, next] = deposits.keys;
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(retry).toBe(first);
    expect(next).not.toBe(first);
  });

  test('Should withdraw the selected asset from its tab', async () => {
    serveAccount(() => balances);
    const withdraws = recordKeys('/withdraw', [noContent]);
    await renderWithApp(MovementPanel, { props: { accountId }, provide: fastWalletApi });

    await fireEvent.click(screen.getByRole('tab', { name: 'Sacar' }));
    await fireEvent.update(screen.getByLabelText('Ativo'), 'BTC');

    expect(screen.getByRole('tab', { name: 'Sacar' }).getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByText('Disponível para saque: 0,50000000 BTC')).toBeTruthy();
    await send('0,25', 'Sacar BTC');
    await screen.findByRole('status');
    expect(withdraws.bodies).toEqual([{ assetId: 'BTC', quantity: '0.25' }]);
  });

  test('Should not send a withdraw above the available balance', async () => {
    serveAccount(() => balances);
    const withdraws = recordKeys('/withdraw', [noContent]);
    await renderWithApp(MovementPanel, { props: { accountId }, provide: fastWalletApi });
    await fireEvent.click(screen.getByRole('tab', { name: 'Sacar' }));
    await screen.findByText('Disponível para saque: 17.600,00 USD');

    await send('17.600,01', 'Sacar USD');

    expect(screen.getByText('O valor passa do disponível para saque. Reduza a quantidade.')).toBeTruthy();
    expect(withdraws.keys).toHaveLength(0);
  });

  test('Should explain a withdraw the wallet refused for insufficient funds', async () => {
    serveAccount(() => balances);
    recordKeys('/withdraw', [() => HttpResponse.json({ error: 'insufficientFunds', message: 'insufficient funds' }, { status: 422 })]);
    await renderWithApp(MovementPanel, { props: { accountId }, provide: fastWalletApi });
    await fireEvent.click(screen.getByRole('tab', { name: 'Sacar' }));
    await screen.findByText('Disponível para saque: 17.600,00 USD');

    await send('100', 'Sacar USD');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Saldo insuficiente para este saque.');
    expect(alert.textContent).toContain('Valores reservados em ordens abertas não podem ser sacados.');
  });
});
