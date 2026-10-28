import { isApiError } from '@/shared/api/apiError';
import type { ApiErrorKind } from '@/shared/api/apiError';

export interface MovementErrorMessage {
  readonly title: string;
  readonly detail?: string;
}

const fallback: MovementErrorMessage = { title: 'Algo deu errado.', detail: 'Nada foi movimentado. Tente de novo em instantes.' };

const byCode: Readonly<Record<string, MovementErrorMessage>> = {
  insufficientFunds: { title: 'Saldo insuficiente para este saque.', detail: 'Valores reservados em ordens abertas não podem ser sacados. Reduza a quantidade ou cancele a ordem.' },
  invalidWalletData: { title: 'O valor não foi aceito.', detail: 'Use um valor maior que zero, com até 2 casas em USD e 8 em BTC.' },
  concurrentUpdate: { title: 'Sua carteira mudou durante a operação.', detail: 'Confira o saldo e tente de novo.' },
};

const byKind: Readonly<Partial<Record<ApiErrorKind, (retryAfterSeconds?: number) => MovementErrorMessage>>> = {
  rateLimited: (seconds) => ({ title: 'Muitas movimentações em pouco tempo.', detail: `${seconds ? `Tente de novo em ${seconds} s.` : 'Espere um pouco e tente de novo.'} Nada foi enviado duas vezes.` }),
  unavailable: () => ({ title: 'A carteira está indisponível agora.', detail: 'Tente de novo em instantes. Se o pedido já tiver chegado, ele não é repetido.' }),
  unauthenticated: () => ({ title: 'Sua sessão terminou.', detail: 'Entre de novo para movimentar a carteira.' }),
};

/** Status and error code of a failed deposit or withdraw, as the user should read it. */
export const movementErrorMessage = (error: unknown): MovementErrorMessage | undefined => {
  if (error === null || error === undefined) return undefined;
  if (!isApiError(error)) return fallback;
  return byCode[error.code] ?? byKind[error.kind]?.(error.retryAfterSeconds) ?? fallback;
};
