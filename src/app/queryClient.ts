import { QueryCache, QueryClient } from '@tanstack/vue-query';
import { isApiError } from '@/shared/api/apiError';

/** The HTTP client already retries what is safe to retry, so the cache does not retry on top of it. */
export const createAppQueryClient = (onUnauthenticated: () => void): QueryClient =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isApiError(error) && error.kind === 'unauthenticated') onUnauthenticated();
      },
    }),
    defaultOptions: {
      queries: { retry: false, staleTime: 2_000, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  });
