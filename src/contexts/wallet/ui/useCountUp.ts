import { onBeforeUnmount, ref, watch } from 'vue';
import { interpolateDecimal } from '../domain/portfolio';

const prefersStill = () => typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A decimal string that counts up (or down) to its target instead of jumping; still under reduced motion. */
export const useCountUp = (target: () => string | undefined, decimals: number, durationMs = 700) => {
  const shown = ref<string | undefined>(undefined);
  let frame = 0;

  watch(
    target,
    (next) => {
      cancelAnimationFrame(frame);
      if (next === undefined) {
        shown.value = undefined;
        return;
      }
      const from = shown.value ?? '0';
      if (prefersStill() || typeof requestAnimationFrame !== 'function') {
        shown.value = interpolateDecimal(from, next, 1, decimals);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs);
        shown.value = interpolateDecimal(from, next, 1 - (1 - progress) ** 3, decimals);
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => cancelAnimationFrame(frame));
  return shown;
};
