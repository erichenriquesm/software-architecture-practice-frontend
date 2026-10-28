import { cleanup } from '@testing-library/vue';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setLogSink } from '@/shared/observability/logger';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
setLogSink(() => undefined);
