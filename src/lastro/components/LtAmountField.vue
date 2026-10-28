<script setup lang="ts">
import { computed } from 'vue';
import LtHelp from './LtHelp.vue';

const props = withDefaults(
  defineProps<{ id: string; label: string; helpTitle?: string | undefined; helpText?: string | undefined; asset?: string | undefined; hint?: string | undefined; error?: string | undefined; placeholder?: string | undefined; disabled?: boolean }>(),
  { placeholder: '0,00', disabled: false },
);
const value = defineModel<string>({ required: true });
const emit = defineEmits<{ blur: [] }>();
const message = computed(() => props.error ?? props.hint);
</script>

<template>
  <div :class="['lt-field', { 'has-error': props.error, 'is-disabled': props.disabled }]">
    <div class="lt-field-box">
      <div class="lt-field-head">
        <label class="lt-field-label" :for="props.id">{{ props.label }}</label>
        <LtHelp v-if="props.helpText" :title="props.helpTitle ?? props.label" :text="props.helpText" />
      </div>
      <div class="lt-field-row">
        <input
          :id="props.id"
          v-model="value"
          class="lt-field-input"
          inputmode="decimal"
          autocomplete="off"
          :placeholder="props.placeholder"
          :disabled="props.disabled"
          :aria-invalid="props.error ? true : undefined"
          :aria-describedby="message ? `${props.id}-hint` : undefined"
          @blur="emit('blur')"
        />
        <span v-if="props.asset" class="lt-field-asset">{{ props.asset }}</span>
      </div>
    </div>
    <Transition name="lt-hint" mode="out-in">
      <p v-if="message" :id="`${props.id}-hint`" :key="props.error ? 'error' : 'hint'" :class="['lt-field-hint', { 'lt-field-error': props.error }]">
        <svg v-if="props.error" class="lt-hint-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.5v4M8 11.2v.1" />
        </svg>
        {{ message }}
      </p>
    </Transition>
  </div>
</template>
