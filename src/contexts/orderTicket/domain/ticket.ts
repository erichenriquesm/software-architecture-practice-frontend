import { z } from 'zod';
import { decimalPattern, isLessThan, isMultipleOf, isPositive, multiply, normalizeTypedDecimal } from '@/entities/decimal';
import type { Market } from '@/entities/market';
import { assetPrecision } from '@/entities/market';
import type { AssetId } from '@/entities/market';
import type { Side } from '@/entities/order';
import { formatDecimal } from '@/shared/format/decimal';

export interface TicketOrder {
  readonly side: Side;
  /** Normalized decimal strings, as the API wants them. */
  readonly price: string;
  readonly quantity: string;
}

export interface Reservation {
  readonly assetId: string;
  readonly amount: string;
}

/** What is free to spend per asset; undefined while it is not known, so nothing is blocked on a guess. */
export type AvailableOf = (assetId: string) => string | undefined;

const isDecimal = (value: string): boolean => decimalPattern.test(value);

const decimalsOf = (assetId: string): number => assetPrecision[assetId as AssetId] ?? 8;

export const formatAsset = (amount: string, assetId: string): string => `${formatDecimal(amount, decimalsOf(assetId))} ${assetId}`;

const formatStep = (step: string, assetId: string): string => `${formatDecimal(step, step.split('.')[1]?.length ?? 0)} ${assetId}`;

/** Price × quantity, or undefined while either is not a valid decimal yet. */
export const orderTotal = (price: string, quantity: string): string | undefined => {
  const [normalizedPrice, normalizedQuantity] = [normalizeTypedDecimal(price), normalizeTypedDecimal(quantity)];
  if (!isDecimal(normalizedPrice) || !isDecimal(normalizedQuantity)) return undefined;
  return multiply(normalizedPrice, normalizedQuantity);
};

/** A buy locks the quote total; a sell locks the base quantity. */
export const reservationOf = (market: Market, side: Side, price: string, quantity: string): Reservation | undefined => {
  if (side === 'sell') {
    const normalized = normalizeTypedDecimal(quantity);
    return isDecimal(normalized) ? { assetId: market.base, amount: normalized } : undefined;
  }
  const total = orderTotal(price, quantity);
  return total === undefined ? undefined : { assetId: market.quote, amount: total };
};

const amountField = (required: string, example: string) =>
  z
    .string()
    .transform(normalizeTypedDecimal)
    .pipe(
      z
        .string()
        .min(1, required)
        .refine((value) => value === '' || isDecimal(value), `Use só números, como ${example}.`),
    );

/**
 * The market filters the backend enforces (tick, step, minimum notional) plus the free balance;
 * the backend stays the authority, this only spares the user a round trip.
 */
export const createTicketSchema = (market: Market, availableOf: AvailableOf) =>
  z
    .object({
      side: z.enum(['buy', 'sell']),
      price: amountField('Informe o preço limite.', '83000,00')
        .refine((price) => !isDecimal(price) || isPositive(price), 'O preço precisa ser maior que zero.')
        .refine((price) => !isDecimal(price) || isMultipleOf(price, market.tickSize), `Use um preço múltiplo de ${formatStep(market.tickSize, market.quote)}.`),
      quantity: amountField('Informe a quantidade.', '0,5')
        .refine((quantity) => !isDecimal(quantity) || isPositive(quantity), 'A quantidade precisa ser maior que zero.')
        .refine((quantity) => !isDecimal(quantity) || isMultipleOf(quantity, market.stepSize), `Use uma quantidade múltipla de ${formatStep(market.stepSize, market.base)}.`),
    })
    .superRefine((order, context) => {
      if (!isDecimal(order.price) || !isDecimal(order.quantity)) return;
      if (isLessThan(multiply(order.price, order.quantity), market.minNotional)) {
        context.addIssue({ code: 'custom', path: ['quantity'], message: `O total precisa ser de ao menos ${formatAsset(market.minNotional, market.quote)}.` });
        return;
      }
      const reservation = reservationOf(market, order.side, order.price, order.quantity);
      const available = reservation && availableOf(reservation.assetId);
      if (!reservation || available === undefined || !isLessThan(available, reservation.amount)) return;
      context.addIssue({ code: 'custom', path: ['quantity'], message: `Saldo insuficiente: disponível ${formatAsset(available, reservation.assetId)}.` });
    });

export type TicketSchema = ReturnType<typeof createTicketSchema>;
export type TicketValues = z.input<TicketSchema>;
export type TicketFields = z.output<TicketSchema>;
