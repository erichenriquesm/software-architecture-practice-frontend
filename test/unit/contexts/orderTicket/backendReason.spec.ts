import { describe, expect, test } from 'vitest';
import { backendReasonText } from '@/contexts/orderTicket/application/backendReason';

describe('Backend reasons in Portuguese', () => {
  test.each([
    ['price: must be a multiple of the tick 0.01', 'O preço precisa ser múltiplo de 0,01 (no máximo 2 casas decimais).'],
    ['price: quantity × price must be at least 5', 'O total da ordem (quantidade × preço) precisa ser de pelo menos 5,00 USD.'],
    ['price: cannot exceed 1000000000', 'O preço máximo aceito é 1.000.000.000,00 USD.'],
    ['quantity: must be a multiple of the step 0.00001', 'A quantidade precisa ser múltipla de 0,00001 BTC (no máximo 5 casas decimais).'],
    ['quantity: must be at least 0.00001', 'A quantidade mínima é 0,00001 BTC.'],
    ['quantity: cannot exceed 1000000', 'A quantidade máxima por ordem é 1.000.000 BTC.'],
    ['quantity: must be greater than zero', 'Informe uma quantidade maior que zero.'],
  ])('Should translate "%s"', (backend, portuguese) => {
    expect(backendReasonText(backend)).toBe(portuguese);
  });

  test('Should give nothing for an unknown reason, so the ticket uses its generic text', () => {
    expect(backendReasonText('side: must be buy or sell')).toBeUndefined();
  });
});
