<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue';

/**
 * A small "?" that explains a term in plain words. Opens on hover, on keyboard focus and on tap; closes on Escape,
 * on leaving or on a tap elsewhere. The bubble is fixed to the viewport and kept inside it, so it never adds scroll.
 */
const props = withDefaults(defineProps<{ title: string; text: string; placement?: 'top' | 'bottom' | undefined }>(), { placement: 'top' });

const id = useId();
const open = ref(false);
const pinned = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const bubble = ref<HTMLElement | null>(null);
const position = ref({ top: 0, left: 0, arrowLeft: 0, side: 'top' as 'top' | 'bottom' });
const margin = 8;

const place = async () => {
  await nextTick();
  if (!trigger.value || !bubble.value) return;
  const anchor = trigger.value.getBoundingClientRect();
  const box = bubble.value.getBoundingClientRect();
  const fitsAbove = anchor.top - box.height - margin * 2 > 0;
  const side = props.placement === 'bottom' || !fitsAbove ? 'bottom' : 'top';
  const centre = anchor.left + anchor.width / 2;
  const left = Math.min(Math.max(margin, centre - box.width / 2), window.innerWidth - box.width - margin);
  const top = side === 'top' ? anchor.top - box.height - margin : Math.min(anchor.bottom + margin, window.innerHeight - box.height - margin);
  position.value = { top, left, arrowLeft: Math.min(Math.max(12, centre - left), box.width - 12), side };
};

const show = () => {
  open.value = true;
  void place();
};
const hide = () => {
  if (pinned.value) return;
  open.value = false;
};
const close = () => {
  pinned.value = false;
  open.value = false;
};
const toggle = () => {
  pinned.value = !pinned.value;
  open.value = pinned.value;
  if (open.value) void place();
};

const onOutside = (event: PointerEvent) => {
  if (!open.value) return;
  const target = event.target as Node;
  if (trigger.value?.contains(target) || bubble.value?.contains(target)) return;
  close();
};
document.addEventListener('pointerdown', onOutside);
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside));

const style = computed(() => ({ top: `${position.value.top}px`, left: `${position.value.left}px`, '--arrow-left': `${position.value.arrowLeft}px` }));
</script>

<template>
  <span class="lt-help" @mouseenter="show" @mouseleave="hide">
    <button
      ref="trigger"
      type="button"
      class="lt-help-trigger"
      :aria-label="`O que é ${props.title}?`"
      :aria-describedby="open ? id : undefined"
      :aria-expanded="open"
      @focus="show"
      @blur="close"
      @click="toggle"
      @keydown.escape.stop="close"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M6.3 6.2a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.9.7-.9 1.3v.2M8 11.4v.1" />
      </svg>
    </button>
    <Teleport to="body">
      <Transition name="lt-help">
        <div v-if="open" :id="id" ref="bubble" role="tooltip" :class="['lt-help-bubble', `is-${position.side}`]" :style="style">
          <strong class="lt-help-title">{{ props.title }}</strong>
          <span class="lt-help-text">{{ props.text }}</span>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>
