import { describe, expect, test, vi } from 'vitest';
import { randomId } from '@/shared/api/randomId';

describe('Random id', () => {
  test('Should build a v4 UUID even where crypto.randomUUID does not exist (plain HTTP)', () => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(undefined as never);
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });

    const ids = new Set(Array.from({ length: 50 }, () => randomId()));

    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
