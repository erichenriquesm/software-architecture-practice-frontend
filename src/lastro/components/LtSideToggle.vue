<script setup lang="ts">
export type LtSide = 'buy' | 'sell';

const props = withDefaults(defineProps<{ labels?: Partial<Record<LtSide, string>> | undefined; disabled?: boolean | undefined; label?: string | undefined }>(), {
  labels: () => ({}),
  disabled: false,
  label: 'Lado da ordem',
});
const side = defineModel<LtSide>({ required: true });
const sides: readonly LtSide[] = ['buy', 'sell'];
const defaults: Record<LtSide, string> = { buy: 'Compra', sell: 'Venda' };

const move = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  side.value = side.value === 'buy' ? 'sell' : 'buy';
};
</script>

<template>
  <div role="radiogroup" :aria-label="props.label" class="lt-sides" :data-side="side" @keydown="move">
    <button
      v-for="option in sides"
      :key="option"
      type="button"
      role="radio"
      :aria-checked="side === option"
      :tabindex="side === option ? 0 : -1"
      :class="['lt-side', `lt-side-${option}`, { 'is-active': side === option }]"
      :disabled="props.disabled"
      @click="side = option"
    >
      {{ props.labels[option] ?? defaults[option] }}
    </button>
  </div>
</template>
