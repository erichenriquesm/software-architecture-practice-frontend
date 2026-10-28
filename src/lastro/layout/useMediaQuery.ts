import { onBeforeUnmount, ref } from 'vue';

/** Reactive matchMedia, e.g. useMediaQuery('(max-width: 760px)') for the phone layout. */
export const useMediaQuery = (query: string) => {
  const list = typeof window === 'undefined' || !window.matchMedia ? undefined : window.matchMedia(query);
  const matches = ref(list?.matches ?? false);
  const update = (event: MediaQueryListEvent) => {
    matches.value = event.matches;
  };
  list?.addEventListener('change', update);
  onBeforeUnmount(() => list?.removeEventListener('change', update));
  return matches;
};
