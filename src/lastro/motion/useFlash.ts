import { Decimal } from 'decimal.js';
import { ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

export type FlashDirection = 'up' | 'down';

/**
 * Lights a value when it changes: 'lt-flash-up' when it rose, 'lt-flash-down' when it fell.
 * The key changes on every tick so the same direction twice still restarts the animation.
 */
export const useFlash = (value: MaybeRefOrGetter<string | undefined>) => {
  const flashClass = ref<string>('');
  const direction = ref<FlashDirection | undefined>(undefined);
  const flashKey = ref(0);

  watch(
    () => toValue(value),
    (next, previous) => {
      if (next === undefined || previous === undefined || next === previous) return;
      direction.value = new Decimal(next).greaterThan(previous) ? 'up' : 'down';
      flashClass.value = `lt-flash-${direction.value}`;
      flashKey.value += 1;
    },
  );

  return { flashClass, direction, flashKey };
};
