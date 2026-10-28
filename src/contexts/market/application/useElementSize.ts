import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';

/** The element's content box in px, kept current; the last non-zero size is kept while it is hidden. */
export const useElementSize = (element: Ref<HTMLElement | null | undefined>, fallback: { width: number; height: number }) => {
  const size = ref({ ...fallback });
  let observer: ResizeObserver | undefined;

  const measure = () => {
    const box = element.value;
    if (!box || box.clientWidth === 0 || box.clientHeight === 0) return;
    if (box.clientWidth === size.value.width && box.clientHeight === size.value.height) return;
    size.value = { width: box.clientWidth, height: box.clientHeight };
  };

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined') return;
    observer = new ResizeObserver(measure);
    watch(element, (current, previous) => {
      if (previous) observer?.unobserve(previous);
      if (current) observer?.observe(current);
      measure();
    }, { immediate: true });
  });
  onBeforeUnmount(() => observer?.disconnect());

  return size;
};
