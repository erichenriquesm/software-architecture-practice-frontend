<script setup lang="ts">
const props = withDefaults(defineProps<{ tone?: 'danger' | 'warning' | 'neutral' | undefined; title: string; detail?: string | undefined }>(), { tone: 'neutral' });
</script>

<template>
  <div :role="props.tone === 'neutral' ? 'status' : 'alert'" :class="['lt-alert', `lt-alert-${props.tone}`]">
    <strong class="lt-alert-title">{{ props.title }}</strong>
    <span v-if="props.detail || $slots.default" class="lt-alert-detail"><slot>{{ props.detail }}</slot></span>
  </div>
</template>
