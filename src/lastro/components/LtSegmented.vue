<script setup lang="ts" generic="T extends string">
/** Tabs for switching panels inside a screen (e.g. Livro / Gráfico / Boleta on a phone). */
const props = defineProps<{ options: ReadonlyArray<{ value: T; label: string }>; label: string; idPrefix: string }>();
const selected = defineModel<T>({ required: true });

const move = (event: KeyboardEvent, index: number) => {
  const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (step === 0) return;
  event.preventDefault();
  const next = props.options[(index + step + props.options.length) % props.options.length];
  if (!next) return;
  selected.value = next.value;
  document.getElementById(`${props.idPrefix}-tab-${next.value}`)?.focus();
};
</script>

<template>
  <div role="tablist" :aria-label="props.label" class="lt-segmented" :style="{ '--count': props.options.length, '--index': props.options.findIndex((option) => option.value === selected) }">
    <span class="lt-segmented-pill" aria-hidden="true"></span>
    <button
      v-for="(option, index) in props.options"
      :id="`${props.idPrefix}-tab-${option.value}`"
      :key="option.value"
      type="button"
      role="tab"
      :aria-selected="selected === option.value"
      :aria-controls="`${props.idPrefix}-panel-${option.value}`"
      :tabindex="selected === option.value ? 0 : -1"
      :class="['lt-segmented-tab', { 'is-active': selected === option.value }]"
      @click="selected = option.value"
      @keydown="move($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
