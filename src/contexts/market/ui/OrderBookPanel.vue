<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import type { Market } from '@/entities/market';
import { LtOrderBook, formatDecimal, useFitCount } from '@/lastro';
import { depthPrecisions } from '../domain/depth';
import { levelsThatFit } from '../domain/fit';
import type { BookView } from '../domain/fit';
import type { DepthLevel } from '../domain/marketData';

const props = defineProps<{
  market: Market;
  bids: readonly DepthLevel[];
  asks: readonly DepthLevel[];
  spread?: string | undefined;
  lastPrice?: string | undefined;
  loading?: boolean | undefined;
}>();
const precision = defineModel<number>('precision', { required: true });
const emit = defineEmits<{ pick: [price: string] }>();

const views: ReadonlyArray<{ value: BookView; label: string }> = [
  { value: 'both', label: 'Compras e vendas' },
  { value: 'bids', label: 'Só compras' },
  { value: 'asks', label: 'Só vendas' },
];
const view = ref<BookView>('both');

/** Rows of 24 px; the column head, the last price strip and the readout below take the rest (heights fixed in market.css). */
const rowHeight = 24;
const bookChrome = 28 + 52 + 56 + 1;
const body = useTemplateRef<HTMLElement>('body');
const rows = useFitCount(body, rowHeight, { reservedPx: bookChrome, min: 2 });
const fitted = computed(() => levelsThatFit(props.bids, props.asks, rows.value, view.value));
const empty = computed(() => props.bids.length === 0 && props.asks.length === 0);
const stepLabel = (step: string) => formatDecimal(step, Math.max(0, step.split('.')[1]?.length ?? 0));

const skeletonWidths = [72, 48, 88, 60, 40, 80, 56, 92, 64, 44];
/** As many placeholder rows as real ones would fit, half of them asks. */
const skeletonRows = computed(() => Array.from({ length: Math.max(2, rows.value) }, (_, index) => ({ width: skeletonWidths[index % skeletonWidths.length] ?? 60, ask: index < Math.max(1, Math.floor(rows.value / 2)) })));

/** Arrow keys move between the view options, like the side toggle. */
const moveView = (event: KeyboardEvent) => {
  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
  if (step === 0) return;
  event.preventDefault();
  const index = views.findIndex((option) => option.value === view.value);
  const next = views[(index + step + views.length) % views.length];
  if (!next) return;
  view.value = next.value;
  (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-view="${next.value}"]`)?.focus();
};
</script>

<template>
  <section class="lt-panel market-book" aria-labelledby="book-title">
    <header class="market-panel-head">
      <div class="market-panel-titles">
        <p class="lt-eyebrow">{{ props.market.marketId }}</p>
        <h2 id="book-title" class="lt-panel-title">Livro de ofertas</h2>
      </div>
      <div class="market-book-tools">
        <div class="market-views" role="radiogroup" aria-label="Lados do livro" @keydown="moveView">
          <button
            v-for="option in views"
            :key="option.value"
            type="button"
            role="radio"
            :data-view="option.value"
            :aria-checked="view === option.value"
            :aria-label="option.label"
            :title="option.label"
            :tabindex="view === option.value ? 0 : -1"
            :class="['market-view', `is-${option.value}`, { 'is-active': view === option.value }]"
            @click="view = option.value"
          >
            <span class="market-view-icon" aria-hidden="true"><i></i><i></i><i></i></span>
          </button>
        </div>
        <label class="market-precision">
          <span>Agrupar</span>
          <span class="market-select-box">
            <select v-model.number="precision" class="market-select">
              <option v-for="option in depthPrecisions" :key="option.value" :value="option.value">{{ stepLabel(option.step) }}</option>
            </select>
          </span>
        </label>
      </div>
    </header>
    <div ref="body" class="market-book-body">
      <div v-if="props.loading" class="market-book-skeleton" aria-busy="true" aria-label="Carregando livro de ofertas">
        <div class="market-skeleton-head"></div>
        <div v-for="(row, index) in skeletonRows" :key="index" :class="['market-skeleton-row', row.ask ? 'is-ask' : 'is-bid', { 'is-first-bid': !row.ask && skeletonRows[index - 1]?.ask }]">
          <span class="lt-skeleton" style="width: 72px"></span>
          <span class="lt-skeleton" :style="{ width: `${row.width}px` }"></span>
          <span class="market-skeleton-bar" :style="{ width: `${row.width / 2}%` }"></span>
        </div>
      </div>
      <div v-else-if="empty" class="lt-empty market-book-empty">
        <p class="lt-empty-title">Livro vazio</p>
        <p class="lt-muted market-empty-detail">Ninguém tem ordem aberta neste mercado agora. A sua pode ser a primeira.</p>
      </div>
      <LtOrderBook
        v-else
        class="market-book-table"
        :bids="fitted.bids"
        :asks="fitted.asks"
        :base="props.market.base"
        :quote="props.market.quote"
        :spread="props.spread"
        :last-price="props.lastPrice"
        @pick="emit('pick', $event)"
      />
    </div>
  </section>
</template>
