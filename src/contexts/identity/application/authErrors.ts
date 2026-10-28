import type { ApiErrorKind } from '@/shared/api/apiError';
import { isApiError } from '@/shared/api/apiError';

export interface AuthErrorMessage {
  readonly title: string;
  readonly detail?: string;
}

const minutes = (seconds: number) => `${Math.max(1, Math.ceil(seconds / 60))} min`;

const messages: Readonly<Partial<Record<ApiErrorKind, (retryAfterSeconds?: number) => AuthErrorMessage>>> = {
  unauthenticated: () => ({ title: 'E-mail ou senha incorretos.', detail: 'Confira os dois campos. Depois de 5 tentativas o acesso fica bloqueado por um tempo.' }),
  rateLimited: (seconds) => ({ title: 'Muitas tentativas de entrar.', detail: seconds ? `Tente de novo em ${minutes(seconds)}.` : 'Espere um pouco e tente de novo.' }),
  business: () => ({ title: 'Este e-mail já tem cadastro.', detail: 'Entre com ele ou use outro e-mail.' }),
  validation: () => ({ title: 'Algum dado não foi aceito.', detail: 'Confira os campos e tente de novo.' }),
  unavailable: () => ({ title: 'Não foi possível falar com o servidor.', detail: 'Verifique sua conexão e tente de novo.' }),
};

export const authErrorMessage = (error: unknown): AuthErrorMessage | undefined => {
  if (error === null || error === undefined) return undefined;
  if (!isApiError(error)) return { title: 'Algo deu errado.', detail: 'Tente de novo em instantes.' };
  return messages[error.kind]?.(error.retryAfterSeconds) ?? { title: 'Algo deu errado.', detail: 'Tente de novo em instantes.' };
};
