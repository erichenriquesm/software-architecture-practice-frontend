import { z } from 'zod';
import { decimalPattern, decimalPlaces, isLessThan, isPositive, normalizeTypedDecimal } from '@/entities/decimal';
import { assetPrecision, assets } from '@/entities/market';
import type { AssetId } from '@/entities/market';

export type MovementKind = 'deposit' | 'withdraw';

export const movementKinds: readonly MovementKind[] = ['deposit', 'withdraw'];

export interface MovementRules {
  readonly kind: MovementKind;
  /** What the account can withdraw right now; reserved funds never count. */
  readonly availableOf: (assetId: AssetId) => string;
}

/** Why a typed quantity cannot be sent, or undefined when it can. The wallet service stays the authority. */
export const quantityIssue = (assetId: AssetId, quantity: string, rules: MovementRules): string | undefined => {
  if (quantity === '') return 'Informe a quantidade.';
  if (!decimalPattern.test(quantity)) return 'Use só números, como 1.500,00.';
  if (decimalPlaces(quantity) > assetPrecision[assetId]) return `${assetId} aceita até ${assetPrecision[assetId]} casas decimais.`;
  if (!isPositive(quantity)) return 'Informe uma quantidade maior que zero.';
  if (rules.kind === 'withdraw' && isLessThan(rules.availableOf(assetId), quantity)) return 'O valor passa do disponível para saque. Reduza a quantidade.';
  return undefined;
};

/** Rules are read on every parse, so the schema follows the selected tab and the latest balances. */
export const movementSchema = (rules: () => MovementRules) =>
  z.object({ assetId: z.enum(assets, 'Escolha um ativo.'), quantity: z.string() }).transform((values, context) => {
    const quantity = normalizeTypedDecimal(values.quantity);
    const issue = quantityIssue(values.assetId, quantity, rules());
    if (issue === undefined) return { assetId: values.assetId, quantity };
    context.addIssue({ code: 'custom', path: ['quantity'], message: issue });
    return z.NEVER;
  });

export type MovementValues = z.input<ReturnType<typeof movementSchema>>;
export type Movement = z.output<ReturnType<typeof movementSchema>>;
