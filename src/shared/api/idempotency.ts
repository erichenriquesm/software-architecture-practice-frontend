import { randomId } from './randomId';

/** One key per user intent (a click), reused by every retry of that same intent. */
export const newIdempotencyKey = (): string => randomId();
