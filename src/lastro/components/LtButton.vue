<script setup lang="ts">
export type LtButtonVariant = 'primary' | 'secondary' | 'ghost' | 'buy' | 'sell';

const props = withDefaults(defineProps<{ variant?: LtButtonVariant | undefined; size?: 'md' | 'sm' | undefined; type?: 'button' | 'submit' | undefined; loading?: boolean | undefined; disabled?: boolean }>(), {
  variant: 'secondary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
});

const marks: Partial<Record<LtButtonVariant, string>> = { buy: '▲', sell: '▼' };
</script>

<template>
  <button
    :type="props.type"
    :class="['lt-btn', `lt-btn-${props.variant}`, `lt-btn-${props.size}`, { 'is-loading': props.loading }]"
    :disabled="props.disabled || props.loading"
    :aria-busy="props.loading || undefined"
  >
    <span v-if="marks[props.variant]" class="lt-btn-mark" aria-hidden="true">{{ marks[props.variant] }}</span>
    <slot></slot>
  </button>
</template>
