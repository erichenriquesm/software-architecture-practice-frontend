<script setup lang="ts">
import { Decimal } from 'decimal.js';
import { computed } from 'vue';
import { formatDecimal } from '../format';

export interface LtDepthLevel {
  readonly price: string;
  readonly quantity: string;
}

const props = withDefaults(defineProps<{ asks: readonly LtDepthLevel[]; bids: readonly LtDepthLevel[]; base: string; quote: string; decimals?: number | undefined; spread?: string | undefined }>(), {
  decimals: 2,
});

const byPriceDescending = (levels: readonly LtDepthLevel[]) => [...levels].sort((first, second) => new Decimal(second.price).comparedTo(first.price));
const asks = computed(() => byPriceDescending(props.asks));
const bids = computed(() => byPriceDescending(props.bids));
const largest = computed(() => Decimal.max(0, ...[...props.asks, ...props.bids].map((level) => level.quantity)));
const barWidth = (level: LtDepthLevel) => `${largest.value.isZero() ? 0 : new Decimal(level.quantity).dividedBy(largest.value).times(100).toFixed(2)}%`;
</script>

<template>
  <div class="lt-book" role="table" aria-label="Livro de ofertas">
    <div class="lt-book-head" role="row">
      <span role="columnheader">Preço ({{ props.quote }})</span>
      <span role="columnheader">Quantidade ({{ props.base }})</span>
    </div>
    <div v-for="level in asks" :key="`ask-${level.price}`" class="lt-book-row lt-book-ask" role="row">
      <span class="lt-book-bar" :style="{ width: barWidth(level) }" aria-hidden="true"></span>
      <span class="lt-book-price" role="cell">{{ formatDecimal(level.price, props.decimals) }}</span>
      <span class="lt-book-qty" role="cell">{{ formatDecimal(level.quantity, 8) }}</span>
    </div>
    <div class="lt-book-spread" role="row">
      <span role="cell">Spread</span>
      <span class="lt-book-qty" role="cell">{{ props.spread === undefined ? '–' : formatDecimal(props.spread, props.decimals) }}</span>
    </div>
    <div v-for="level in bids" :key="`bid-${level.price}`" class="lt-book-row lt-book-bid" role="row">
      <span class="lt-book-bar" :style="{ width: barWidth(level) }" aria-hidden="true"></span>
      <span class="lt-book-price" role="cell">{{ formatDecimal(level.price, props.decimals) }}</span>
      <span class="lt-book-qty" role="cell">{{ formatDecimal(level.quantity, 8) }}</span>
    </div>
  </div>
</template>
