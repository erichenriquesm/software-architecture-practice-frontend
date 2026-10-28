import { describe, expect, test } from 'vitest';
import { movementSchema } from '@/contexts/wallet/domain/movement';
import type { MovementKind } from '@/contexts/wallet/domain/movement';
import { movementErrorMessage } from '@/contexts/wallet/application/movementErrors';
import { ApiError } from '@/shared/api/apiError';

const available = { USD: '17600.00', BTC: '0.5' } as const;
const schemaFor = (kind: MovementKind) => movementSchema(() => ({ kind, availableOf: (assetId) => available[assetId] }));
const quantityError = (kind: MovementKind, assetId: 'USD' | 'BTC', quantity: string) => {
  const result = schemaFor(kind).safeParse({ assetId, quantity });
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === 'quantity')?.message;
};

describe('Movement rules', () => {
  test('Should read a pt-BR typed amount as the decimal string the API expects', () => {
    expect(schemaFor('deposit').parse({ assetId: 'USD', quantity: '1.500,25' })).toEqual({ assetId: 'USD', quantity: '1500.25' });
    expect(schemaFor('deposit').parse({ assetId: 'BTC', quantity: '0,12345678' })).toEqual({ assetId: 'BTC', quantity: '0.12345678' });
  });

  test.each([
    ['USD', '10,123', 'USD aceita até 2 casas decimais.'],
    ['BTC', '0,123456789', 'BTC aceita até 8 casas decimais.'],
    ['USD', '0', 'Informe uma quantidade maior que zero.'],
    ['USD', '', 'Informe a quantidade.'],
    ['USD', '12a', 'Use só números, como 1.500,00.'],
  ] as const)('Should refuse %s %s', (assetId, quantity, message) => {
    expect(quantityError('deposit', assetId, quantity)).toBe(message);
  });

  test('Should refuse a withdraw above what is available, and accept exactly the available amount', () => {
    expect(quantityError('withdraw', 'BTC', '0,50000001')).toBe('O valor passa do disponível para saque. Reduza a quantidade.');
    expect(quantityError('withdraw', 'BTC', '0,5')).toBeUndefined();
    expect(quantityError('deposit', 'BTC', '10')).toBeUndefined();
  });
});

describe('Movement error messages', () => {
  test('Should explain the wallet refusals by their code', () => {
    expect(movementErrorMessage(new ApiError(422, 'insufficientFunds', 'x'))?.title).toBe('Saldo insuficiente para este saque.');
    expect(movementErrorMessage(new ApiError(422, 'invalidWalletData', 'x'))?.title).toBe('O valor não foi aceito.');
    expect(movementErrorMessage(new ApiError(409, 'concurrentUpdate', 'x'))?.title).toBe('Sua carteira mudou durante a operação.');
  });

  test('Should say how long to wait after a 429 and fall back for the unknown', () => {
    expect(movementErrorMessage(new ApiError(429, 'tooManyRequests', 'x', 8))?.detail).toBe('Tente de novo em 8 s. Nada foi enviado duas vezes.');
    expect(movementErrorMessage(new Error('boom'))?.title).toBe('Algo deu errado.');
    expect(movementErrorMessage(null)).toBeUndefined();
  });
});
