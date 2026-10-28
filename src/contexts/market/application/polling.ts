import { isApiError } from '@/shared/api/apiError';

export const marketPollMs = 2_000;

/** Polls every 2 s; after a 429 the next poll of that query waits the whole Retry-After instead. */
export const nextPollMs = (error: unknown): number => {
  if (isApiError(error) && error.kind === 'rateLimited' && error.retryAfterSeconds !== undefined) return Math.max(marketPollMs, error.retryAfterSeconds * 1_000);
  return marketPollMs;
};

export const pollingOptions = {
  refetchInterval: (query: { state: { error: unknown } }) => nextPollMs(query.state.error),
  refetchIntervalInBackground: false,
} as const;
