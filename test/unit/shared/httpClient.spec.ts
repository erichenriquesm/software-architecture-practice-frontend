import { describe, expect, test } from 'vitest';
import { ApiError } from '@/shared/api/apiError';
import { createHttpClient } from '@/shared/api/httpClient';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const clientWith = (...responses: Array<Response | Error>) => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const waits: number[] = [];
  const client = createHttpClient({
    fetchImplementation: async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next ?? json(500, {});
    },
    sleep: async (ms) => void waits.push(ms),
    backoffMs: 100,
    baseUrl: 'http://edge.test',
  });
  return { client, calls, waits };
};

const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name];

describe('HTTP client', () => {
  test('Should send the cookie, a request id and JSON, and give back the parsed body', async () => {
    // Given
    const { client, calls } = clientWith(json(200, { accountId: 'a-1' }));

    // When
    const body = await client.post('/signup', { body: { name: 'Ana' } });

    // Then
    expect(body).toEqual({ accountId: 'a-1' });
    expect(calls[0]?.init.credentials).toBe('include');
    expect(header(calls[0]!.init, 'x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(header(calls[0]!.init, 'content-type')).toBe('application/json');
  });

  test('Should turn an error response into an ApiError with its kind, code and Retry-After', async () => {
    const { client } = clientWith(json(429, { error: 'tooManyLoginAttempts', message: 'slow down' }, { 'retry-after': '300' }));

    const error = await client.post('/login', { body: {} }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, kind: 'rateLimited', code: 'tooManyLoginAttempts', retryAfterSeconds: 300 });
  });

  test('Should retry a GET on 503 with backoff and succeed', async () => {
    const { client, calls, waits } = clientWith(json(503, {}), json(200, { ok: true }));

    await expect(client.get('/markets/BTC-USD')).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
    expect(waits[0]).toBeGreaterThanOrEqual(100);
  });

  test('Should retry a POST only when it carries an Idempotency-Key, always with the same key', async () => {
    // Given
    const withKey = clientWith(new TypeError('network down'), json(204, undefined));
    const withoutKey = clientWith(new TypeError('network down'));

    // When
    await withKey.client.post('/deposit', { body: {}, idempotencyKey: 'key-1' });
    const error = await withoutKey.client.post('/signup', { body: {} }).catch((caught: unknown) => caught);

    // Then
    expect(withKey.calls.map((call) => header(call.init, 'idempotency-key'))).toEqual(['key-1', 'key-1']);
    expect(withoutKey.calls).toHaveLength(1);
    expect(error).toMatchObject({ kind: 'unavailable', code: 'networkError' });
  });

  test('Should wait at least Retry-After before repeating after a 429', async () => {
    const { client, waits } = clientWith(json(429, {}, { 'retry-after': '2' }), json(200, {}));

    await client.get('/markets/BTC-USD/depth');

    expect(waits[0]).toBeGreaterThanOrEqual(2_000);
  });

  test('Should never retry a domain error', async () => {
    const { client, calls } = clientWith(json(422, { error: 'insufficientFunds' }));

    await expect(client.post('/place_order', { body: {}, idempotencyKey: 'k' })).rejects.toMatchObject({ kind: 'validation' });
    expect(calls).toHaveLength(1);
  });
});
