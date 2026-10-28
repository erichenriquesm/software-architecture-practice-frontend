import { ApiError, isRetryable } from './apiError';

export interface RequestOptions {
  readonly body?: unknown;
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
}

export interface HttpClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, options?: RequestOptions): Promise<T>;
}

export interface HttpClientOptions {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly backoffMs?: number;
  readonly fetchImplementation?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const apiErrorOf = async (response: Response): Promise<ApiError> => {
  const body = (await parseBody(response)) as { error?: string; message?: string } | undefined;
  const retryAfter = Number(response.headers.get('retry-after'));
  return new ApiError(response.status, body?.error ?? 'httpError', body?.message ?? response.statusText, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined);
};

/**
 * The only way the app talks to the edge: same origin, cookie included, a request id on every call.
 * A call is repeated only when it is safe: a GET, or a POST that carries an Idempotency-Key (the same key every time).
 */
export const createHttpClient = (options: HttpClientOptions = {}): HttpClient => {
  const baseUrl = options.baseUrl ?? '';
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxAttempts = options.maxAttempts ?? 3;
  const backoffMs = options.backoffMs ?? 300;
  const doFetch = options.fetchImplementation ?? ((input, init) => fetch(input, init));
  const sleep = options.sleep ?? wait;

  const once = async <T>(method: string, path: string, request: RequestOptions): Promise<T> => {
    const headers: Record<string, string> = { accept: 'application/json', 'x-request-id': crypto.randomUUID() };
    if (request.body !== undefined) headers['content-type'] = 'application/json';
    if (request.idempotencyKey) headers['idempotency-key'] = request.idempotencyKey;
    const signal = request.signal ? AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
    let response: Response;
    try {
      response = await doFetch(new URL(path, baseUrl || globalThis.location.origin), { method, headers, credentials: 'include', signal, body: request.body === undefined ? null : JSON.stringify(request.body) });
    } catch (error) {
      if (request.signal?.aborted) throw error;
      throw new ApiError(0, 'networkError', 'Sem conexão com o servidor.');
    }
    if (!response.ok) throw await apiErrorOf(response);
    return (await parseBody(response)) as T;
  };

  const send = async <T>(method: string, path: string, request: RequestOptions = {}): Promise<T> => {
    const repeatable = method === 'GET' || request.idempotencyKey !== undefined;
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await once<T>(method, path, request);
      } catch (error) {
        if (!repeatable || attempt >= maxAttempts || !isRetryable(error)) throw error;
        const retryAfterMs = (error as ApiError).retryAfterSeconds === undefined ? 0 : Number((error as ApiError).retryAfterSeconds) * 1_000;
        const jitter = Math.random() * backoffMs;
        await sleep(Math.max(retryAfterMs, backoffMs * 2 ** (attempt - 1) + jitter));
      }
    }
  };

  return {
    get: (path, request) => send('GET', path, request),
    post: (path, request) => send('POST', path, request),
  };
};

export const httpClient = createHttpClient();
