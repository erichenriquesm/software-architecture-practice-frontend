import { describe, expect, test } from 'vitest';
import { marketPollMs, nextPollMs } from '@/contexts/market/application/polling';
import { ApiError } from '@/shared/api/apiError';

describe('Market polling', () => {
  test('Should poll every 2 s while things go well or fail for other reasons', () => {
    expect(marketPollMs).toBe(2_000);
    expect(nextPollMs(null)).toBe(2_000);
    expect(nextPollMs(new ApiError(503, 'unavailable', 'down'))).toBe(2_000);
  });

  test('Should wait the whole Retry-After before polling again after a 429', () => {
    expect(nextPollMs(new ApiError(429, 'tooManyRequests', 'slow down', 30))).toBe(30_000);
    expect(nextPollMs(new ApiError(429, 'tooManyRequests', 'slow down'))).toBe(2_000);
  });
});
