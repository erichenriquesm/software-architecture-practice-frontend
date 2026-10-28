<script setup lang="ts">
import { computed } from 'vue';
import { formatDecimal } from '../format';

const props = withDefaults(defineProps<{ marketId: string; price?: string | undefined; quote: string; change?: string | undefined; decimals?: number | undefined }>(), { decimals: 2 });
const up = computed(() => !props.change?.startsWith('-'));
</script>

<template>
  <div class="lt-ticker">
    <span class="lt-ticker-market">{{ props.marketId }}</span>
    <span class="lt-ticker-price">
      {{ props.price === undefined ? '–' : formatDecimal(props.price, props.decimals) }}<span class="lt-unit">{{ props.quote }}</span>
    </span>
    <span v-if="props.change !== undefined" :class="['lt-ticker-change', up ? 'is-up' : 'is-down']">
      {{ up ? '▲ +' : '▼ ' }}{{ formatDecimal(props.change, 2) }}%
    </span>
  </div>
</template>
