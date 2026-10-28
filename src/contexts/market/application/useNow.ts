import { onScopeDispose, ref } from 'vue';

/** The current time, refreshed every interval; the timer stops with the component that uses it. */
export const useNow = (intervalMs = 1_000) => {
  const now = ref(Date.now());
  const timer = setInterval(() => {
    now.value = Date.now();
  }, intervalMs);
  onScopeDispose(() => clearInterval(timer));
  return now;
};
