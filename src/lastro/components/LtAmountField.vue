<script setup lang="ts">
const props = withDefaults(defineProps<{ id: string; label: string; asset?: string | undefined; hint?: string | undefined; error?: string | undefined; placeholder?: string | undefined; disabled?: boolean }>(), {
  placeholder: '0,00',
  disabled: false,
});
const value = defineModel<string>({ required: true });
const emit = defineEmits<{ blur: [] }>();
</script>

<template>
  <div :class="['lt-field', { 'has-error': props.error }]">
    <label class="lt-field-label" :for="props.id">{{ props.label }}</label>
    <div class="lt-field-box">
      <input
        :id="props.id"
        v-model="value"
        class="lt-field-input"
        inputmode="decimal"
        autocomplete="off"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :aria-invalid="props.error ? true : undefined"
        :aria-describedby="props.error || props.hint ? `${props.id}-hint` : undefined"
        @blur="emit('blur')"
      />
      <span v-if="props.asset" class="lt-field-asset">{{ props.asset }}</span>
    </div>
    <p v-if="props.error || props.hint" :id="`${props.id}-hint`" class="lt-field-hint">{{ props.error ?? props.hint }}</p>
  </div>
</template>
