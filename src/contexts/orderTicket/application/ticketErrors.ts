import type { ApiErrorKind } from '@/shared/api/apiError';
import { isApiError } from '@/shared/api/apiError';
import { backendReasonText } from './backendReason';

export interface TicketErrorMessage {
  readonly title: string;
  readonly detail?: string;
}

const fallback: TicketErrorMessage = { title: 'Algo deu errado ao enviar a ordem.', detail: 'Confira em Ordens se ela entrou antes de tentar de novo.' };

/** The backend's own words are English and technical: show a translation, never the raw text. */
const rejected = (backendMessage: string): TicketErrorMessage => ({
  title: 'A ordem não foi aceita.',
  detail: backendReasonText(backendMessage) ?? 'Confira o preço e a quantidade e tente de novo.',
});

/** 429 is not here: it becomes a countdown (rateLimitMessage) because its text changes every second. */
const messages: Readonly<Partial<Record<ApiErrorKind, (backendMessage: string) => TicketErrorMessage>>> = {
  validation: rejected,
  business: rejected,
  unavailable: () => ({ title: 'O envio de ordens está indisponível agora.', detail: 'Tente de novo em instantes. Nada foi enviado duas vezes.' }),
  unauthenticated: () => ({ title: 'Sua sessão terminou.', detail: 'Entre de novo para enviar a ordem.' }),
};

export const ticketErrorMessage = (error: unknown): TicketErrorMessage | undefined => {
  if (error === null || error === undefined) return undefined;
  if (!isApiError(error)) return fallback;
  if (error.kind === 'rateLimited') return undefined;
  return messages[error.kind]?.(error.message) ?? fallback;
};

export const rateLimitMessage = (secondsLeft: number): TicketErrorMessage => ({
  title: 'Muitas ordens em pouco tempo.',
  detail: `Você pode enviar de novo em ${secondsLeft} s. Nada foi enviado duas vezes.`,
});

export const rejectionMessage = (statusReason: string | undefined): TicketErrorMessage =>
  statusReason?.includes('INSUFFICIENT_FUNDS')
    ? { title: 'A ordem foi rejeitada por saldo insuficiente.', detail: 'O saldo mudou antes da reserva. Reduza a quantidade ou deposite mais.' }
    : { title: 'A ordem foi rejeitada.', detail: 'Veja o motivo no detalhe da ordem.' };
