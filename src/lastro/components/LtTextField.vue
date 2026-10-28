<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    type?: 'text' | 'email' | 'password' | undefined;
    autocomplete?: string | undefined;
    inputmode?: 'text' | 'numeric' | 'email' | undefined;
    error?: string | undefined;
    hint?: string | undefined;
    disabled?: boolean;
  }>(),
  { type: 'text', disabled: false },
);
const value = defineModel<string>({ required: true });
const emit = defineEmits<{ blur: [] }>();

const revealed = ref(false);
const inputType = computed(() => (props.type === 'password' && revealed.value ? 'text' : props.type));
const message = computed(() => props.error ?? props.hint);
</script>

<template>
  <div :class="['lt-text-field', { 'has-error': props.error, 'is-disabled': props.disabled, 'has-toggle': props.type === 'password' }]">
    <div class="lt-input-shell">
      <!-- The single-space placeholder lets CSS float the label once something is typed (:placeholder-shown) -->
      <input
        :id="props.id"
        v-model="value"
        class="lt-input"
        placeholder=" "
        :type="inputType"
        :autocomplete="props.autocomplete"
        :inputmode="props.inputmode"
        :disabled="props.disabled"
        :aria-invalid="props.error ? true : undefined"
        :aria-describedby="message ? `${props.id}-hint` : undefined"
        @blur="emit('blur')"
      />
      <label class="lt-input-label" :for="props.id">{{ props.label }}</label>
      <button
        v-if="props.type === 'password'"
        type="button"
        class="lt-input-toggle"
        :aria-pressed="revealed"
        :aria-label="revealed ? 'Ocultar senha' : 'Mostrar senha'"
        :disabled="props.disabled"
        @click="revealed = !revealed"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          <path v-if="revealed" d="M4 4l16 16" />
        </svg>
      </button>
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
    <slot></slot>
  </div>
</template>
