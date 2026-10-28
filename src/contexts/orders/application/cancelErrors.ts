import { isApiError } from '@/shared/api/apiError';
import type { ApiErrorKind } from '@/shared/api/apiError';

export interface CancelErrorMessage {
  readonly title: string;
  readonly detail?: string;
}

const fallback: CancelErrorMessage = { title: 'Não foi possível cancelar a ordem.', detail: 'Tente de novo em instantes.' };

const byKind: Readonly<Partial<Record<ApiErrorKind, (retryAfterSeconds?: number) => CancelErrorMessage>>> = {
  business: () => ({ title: 'Esta ordem não pode mais ser cancelada.', detail: 'Ela já foi executada ou cancelada. A lista foi atualizada.' }),
  forbidden: () => ({ title: 'Esta ordem não é da sua conta.', detail: 'Só quem enviou a ordem pode cancelá-la.' }),
  notFound: () => ({ title: 'Ordem não encontrada.', detail: 'Atualize a lista e tente de novo.' }),
  rateLimited: (seconds) => ({ title: 'Muitos pedidos em pouco tempo.', detail: `${seconds ? `Tente de novo em ${seconds} s.` : 'Espere um pouco e tente de novo.'} Nada foi enviado duas vezes.` }),
  unavailable: () => ({ title: 'O serviço de ordens está indisponível agora.', detail: 'Tente de novo em instantes. Se o pedido já tiver chegado, ele não é repetido.' }),
  unauthenticated: () => ({ title: 'Sua sessão terminou.', detail: 'Entre de novo para cancelar a ordem.' }),
};

export const cancelErrorMessage = (error: unknown): CancelErrorMessage | undefined => {
  if (error === null || error === undefined) return undefined;
  if (!isApiError(error)) return fallback;
  return byKind[error.kind]?.(error.retryAfterSeconds) ?? fallback;
};
