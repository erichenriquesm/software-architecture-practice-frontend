import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query';
import { isApiError } from '@/shared/api/apiError';

/** A 401 means the session ended. The login form itself expects 401 for wrong credentials, so its mutation opts out. */
const endSessionOn = (error: unknown, onUnauthenticated: () => void, meta?: Record<string, unknown>): void => {
  if (meta?.expectsUnauthenticated === true) return;
  if (isApiError(error) && error.kind === 'unauthenticated') onUnauthenticated();
};

/** The HTTP client already retries what is safe to retry, so the cache does not retry on top of it. */
export const createAppQueryClient = (onUnauthenticated: () => void): QueryClient =>
  new QueryClient({
    queryCache: new QueryCache({ onError: (error) => endSessionOn(error, onUnauthenticated) }),
    mutationCache: new MutationCache({ onError: (error, _variables, _context, mutation) => endSessionOn(error, onUnauthenticated, mutation.options.meta) }),
    defaultOptions: {
      queries: { retry: false, staleTime: 2_000, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  });
