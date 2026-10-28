import { computed, onScopeDispose, ref } from 'vue';

/** Whole seconds left until a moment; ticks once a second and stops by itself at zero. */
export const useCountdown = () => {
  const until = ref<number | undefined>(undefined);
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };

  const tick = () => {
    now.value = Date.now();
    if (until.value === undefined || now.value >= until.value) stop();
  };

  const start = (seconds: number) => {
    stop();
    now.value = Date.now();
    until.value = now.value + seconds * 1_000;
    timer = setInterval(tick, 1_000);
  };

  onScopeDispose(stop);

  return {
    secondsLeft: computed(() => (until.value === undefined ? 0 : Math.max(0, Math.ceil((until.value - now.value) / 1_000)))),
    start,
  };
};
