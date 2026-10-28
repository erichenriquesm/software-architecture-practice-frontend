<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{ percentage: number; tone: 'active' | 'success' | 'ended' }>();

const radius = 52;
const circumference = 2 * Math.PI * radius;
const drawn = ref(false);
/** Starts empty and fills to the value after mounting, so the ring animates in. */
const offset = computed(() => circumference * (1 - (drawn.value ? props.percentage : 0) / 100));

onMounted(() => {
  if (typeof requestAnimationFrame !== 'function') {
    drawn.value = true;
    return;
  }
  requestAnimationFrame(() => {
    drawn.value = true;
  });
});
</script>

<template>
  <div
    :class="['order-ring', `tone-${props.tone}`]"
    role="progressbar"
    aria-label="Execução da ordem"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="props.percentage"
  >
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle class="order-ring-track" cx="60" cy="60" :r="radius" />
      <circle class="order-ring-fill" cx="60" cy="60" :r="radius" :stroke-dasharray="circumference" :stroke-dashoffset="offset" />
    </svg>
    <span class="order-ring-value" aria-hidden="true"><span class="lt-num">{{ props.percentage }}</span><span class="order-ring-unit">%</span></span>
  </div>
</template>
