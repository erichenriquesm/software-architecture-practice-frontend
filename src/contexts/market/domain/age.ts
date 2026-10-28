/** Whole seconds from a moment to now, never negative (the server clock may run slightly ahead). */
export const secondsSince = (moment: string | number, nowMs: number): number => {
  const then = typeof moment === 'number' ? moment : Date.parse(moment);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((nowMs - then) / 1_000));
};

/** A trade this young reads as "agora" instead of a clock time. */
export const justNowSeconds = 5;

export const isJustNow = (timestamp: string, nowMs: number): boolean => secondsSince(timestamp, nowMs) < justNowSeconds;

export type AgeUnit = 's' | 'min' | 'h' | 'd';

/** An age in the largest whole unit that fits: 42 s, 7 min, 3 h, 2 d. */
export const ageOf = (seconds: number): { readonly value: number; readonly unit: AgeUnit } => {
  if (seconds < 60) return { value: seconds, unit: 's' };
  if (seconds < 3_600) return { value: Math.floor(seconds / 60), unit: 'min' };
  if (seconds < 86_400) return { value: Math.floor(seconds / 3_600), unit: 'h' };
  return { value: Math.floor(seconds / 86_400), unit: 'd' };
};
