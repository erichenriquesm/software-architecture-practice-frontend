<script setup lang="ts">
const props = withDefaults(
  defineProps<{ id: string; label: string; type?: 'text' | 'email' | 'password' | undefined; autocomplete?: string | undefined; inputmode?: 'text' | 'numeric' | 'email' | undefined; error?: string | undefined; hint?: string | undefined; disabled?: boolean }>(),
  { type: 'text', disabled: false },
);
const value = defineModel<string>({ required: true });
const emit = defineEmits<{ blur: [] }>();
</script>

<template>
  <div :class="['lt-text-field', { 'has-error': props.error }]">
    <label class="lt-field-label" :for="props.id">{{ props.label }}</label>
    <input
      :id="props.id"
      v-model="value"
      :type="props.type"
      :autocomplete="props.autocomplete"
      :inputmode="props.inputmode"
      :disabled="props.disabled"
      :aria-invalid="props.error ? true : undefined"
      :aria-describedby="props.error || props.hint ? `${props.id}-hint` : undefined"
      @blur="emit('blur')"
    />
    <p v-if="props.error || props.hint" :id="`${props.id}-hint`" :class="['lt-field-hint', { 'lt-field-error': props.error }]">{{ props.error ?? props.hint }}</p>
    <slot></slot>
  </div>
</template>
