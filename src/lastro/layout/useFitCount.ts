import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * How many rows of `rowHeight` px fit in the element right now (after `reservedPx` for headers or footers).
 * Screens never scroll: a list shows what fits and the rest goes behind a page or is cut.
 */
export const useFitCount = (container: Ref<HTMLElement | null | undefined>, rowHeight: number, options: { reservedPx?: number; min?: number } = {}) => {
  const count = ref(options.min ?? 1);
  let observer: ResizeObserver | undefined;

  const measure = () => {
    const height = container.value?.clientHeight ?? 0;
    count.value = Math.max(options.min ?? 1, Math.floor((height - (options.reservedPx ?? 0)) / rowHeight));
  };

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined') return;
    observer = new ResizeObserver(measure);
    watch(container, (element, previous) => {
      if (previous) observer?.unobserve(previous);
      if (element) observer?.observe(element);
      measure();
    }, { immediate: true });
  });
  onBeforeUnmount(() => observer?.disconnect());

  return count;
};
