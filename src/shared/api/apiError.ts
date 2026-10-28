/** How the UI treats a failed call; every status maps to exactly one kind (sdd/09-frontend.md §4.3). */
export type ApiErrorKind = 'validation' | 'business' | 'unauthenticated' | 'forbidden' | 'notFound' | 'rateLimited' | 'unavailable' | 'unexpected';

const kindByStatus: ReadonlyMap<number, ApiErrorKind> = new Map([
  [401, 'unauthenticated'],
  [403, 'forbidden'],
  [404, 'notFound'],
  [409, 'business'],
  [422, 'validation'],
  [429, 'rateLimited'],
  [502, 'unavailable'],
  [503, 'unavailable'],
  [504, 'unavailable'],
]);

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = status === 0 ? 'unavailable' : (kindByStatus.get(status) ?? 'unexpected');
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/** Network failures, timeouts and 503 may succeed on a retry; 429 too, after Retry-After. A domain 4xx never. */
export const isRetryable = (error: unknown): boolean => isApiError(error) && (error.kind === 'unavailable' || error.kind === 'rateLimited');
