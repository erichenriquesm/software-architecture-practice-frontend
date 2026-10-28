import { setupServer } from 'msw/node';

/** Every test that reaches the network declares its handlers with server.use(); anything else fails the test. */
export const server = setupServer();
