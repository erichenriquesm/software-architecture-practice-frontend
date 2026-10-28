<script setup lang="ts">
import { Decimal } from 'decimal.js';
import { computed, ref } from 'vue';
import { formatDecimal } from '../format';
import { useFlash } from '../motion/useFlash';

export interface LtDepthLevel {
  readonly price: string;
  readonly quantity: string;
}

type BookSide = 'ask' | 'bid';

const props = withDefaults(
  defineProps<{
    asks: readonly LtDepthLevel[];
    bids: readonly LtDepthLevel[];
    base: string;
    quote: string;
    decimals?: number | undefined;
    spread?: string | undefined;
    lastPrice?: string | undefined;
  }>(),
  { decimals: 2 },
);
const emit = defineEmits<{ pick: [price: string] }>();

const byPriceDescending = (levels: readonly LtDepthLevel[]) => [...levels].sort((first, second) => new Decimal(second.price).comparedTo(first.price));
const asks = computed(() => byPriceDescending(props.asks));
const bids = computed(() => byPriceDescending(props.bids));
const largest = computed(() => Decimal.max(0, ...[...props.asks, ...props.bids].map((level) => level.quantity)));
const barWidth = (level: LtDepthLevel) => `${largest.value.isZero() ? 0 : new Decimal(level.quantity).dividedBy(largest.value).times(100).toFixed(2)}%`;

const bestAsk = computed(() => asks.value.at(-1)?.price);
const bestBid = computed(() => bids.value[0]?.price);
const mid = computed(() => (bestAsk.value && bestBid.value ? new Decimal(bestAsk.value).plus(bestBid.value).dividedBy(2) : undefined));

const hovered = ref<{ side: BookSide; index: number } | undefined>(undefined);

/** Levels a market order would walk through to reach the hovered one: from the best price outwards. */
const rangeOf = (side: BookSide, index: number): readonly LtDepthLevel[] => (side === 'ask' ? asks.value.slice(index) : bids.value.slice(0, index + 1));
const inRange = (side: BookSide, index: number) => {
  if (!hovered.value || hovered.value.side !== side) return false;
  return side === 'ask' ? index >= hovered.value.index : index <= hovered.value.index;
};

const readout = computed(() => {
  if (!hovered.value) return undefined;
  const levels = rangeOf(hovered.value.side, hovered.value.index);
  const quantity = levels.reduce((total, level) => total.plus(level.quantity), new Decimal(0));
  const value = levels.reduce((total, level) => total.plus(new Decimal(level.quantity).times(level.price)), new Decimal(0));
  const edge = levels.at(hovered.value.side === 'ask' ? 0 : -1);
  const distance = mid.value && edge ? new Decimal(edge.price).minus(mid.value).dividedBy(mid.value).times(100) : undefined;
  return {
    quantity: quantity.toFixed(8),
    average: quantity.isZero() ? '0' : value.dividedBy(quantity).toFixed(2),
    value: value.toFixed(2),
    distance: distance?.toFixed(2),
  };
});

const { flashClass, direction, flashKey } = useFlash(() => props.lastPrice);
</script>

<template>
  <div class="lt-book" role="table" aria-label="Livro de ofertas" @mouseleave="hovered = undefined">
    <div class="lt-book-head" role="row">
      <span role="columnheader">Preço ({{ props.quote }})</span>
      <span role="columnheader">Quantidade ({{ props.base }})</span>
    </div>
    <div
      v-for="(level, index) in asks"
      :key="`ask-${level.price}`"
      :class="['lt-book-row', 'lt-book-ask', { 'is-in-range': inRange('ask', index) }]"
      role="row"
      @mouseenter="hovered = { side: 'ask', index }"
    >
      <span class="lt-book-bar" :style="{ width: barWidth(level) }" aria-hidden="true"></span>
      <span role="cell" class="lt-book-cell">
        <button type="button" class="lt-book-price lt-book-pick" :aria-label="`Usar o preço ${formatDecimal(level.price, props.decimals)}`" @click="emit('pick', level.price)" @focus="hovered = { side: 'ask', index }">
          {{ formatDecimal(level.price, props.decimals) }}
        </button>
      </span>
      <span class="lt-book-qty" role="cell">{{ formatDecimal(level.quantity, 8) }}</span>
    </div>

    <div class="lt-book-mid" role="row">
      <span role="cell" class="lt-book-last">
        <span :key="flashKey" :class="['lt-book-last-price', flashClass, direction ? `is-${direction}` : '']">
          <span v-if="direction" aria-hidden="true">{{ direction === 'up' ? '▲' : '▼' }}</span>
          {{ props.lastPrice === undefined ? '–' : formatDecimal(props.lastPrice, props.decimals) }}
        </span>
        {{ ' ' }}<span class="lt-book-mid-label">último preço</span>
      </span>
      <span role="cell" class="lt-book-qty lt-book-spread-cell">
        <span class="lt-book-mid-label">spread</span>{{ ' ' }}
        {{ props.spread === undefined ? '–' : formatDecimal(props.spread, props.decimals) }}
      </span>
    </div>

    <div
      v-for="(level, index) in bids"
      :key="`bid-${level.price}`"
      :class="['lt-book-row', 'lt-book-bid', { 'is-in-range': inRange('bid', index) }]"
      role="row"
      @mouseenter="hovered = { side: 'bid', index }"
    >
      <span class="lt-book-bar" :style="{ width: barWidth(level) }" aria-hidden="true"></span>
      <span role="cell" class="lt-book-cell">
        <button type="button" class="lt-book-price lt-book-pick" :aria-label="`Usar o preço ${formatDecimal(level.price, props.decimals)}`" @click="emit('pick', level.price)" @focus="hovered = { side: 'bid', index }">
          {{ formatDecimal(level.price, props.decimals) }}
        </button>
      </span>
      <span class="lt-book-qty" role="cell">{{ formatDecimal(level.quantity, 8) }}</span>
    </div>

    <div class="lt-book-readout" aria-live="polite">
      <template v-if="readout">
        <span><span class="lt-book-mid-label">soma</span> {{ formatDecimal(readout.quantity, 8) }} {{ props.base }}</span>
        <span><span class="lt-book-mid-label">médio</span> {{ formatDecimal(readout.average, props.decimals) }}</span>
        <span><span class="lt-book-mid-label">total</span> {{ formatDecimal(readout.value, 2) }} {{ props.quote }}</span>
        <span v-if="readout.distance !== undefined"><span class="lt-book-mid-label">do meio</span> {{ formatDecimal(readout.distance, 2) }}%</span>
      </template>
      <span v-else class="lt-book-mid-label">Passe o mouse num nível para ver o acumulado. Clique no preço para usar na ordem.</span>
    </div>
  </div>
</template>
