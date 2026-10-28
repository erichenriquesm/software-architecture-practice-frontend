<script setup lang="ts">
import { computed } from 'vue';
import type { Market } from '@/entities/market';
import { LtOrderBook, formatDecimal } from '@/lastro';
import { depthPrecisions, nearestLevels } from '../domain/depth';
import type { DepthLevel } from '../domain/marketData';

const props = defineProps<{ market: Market; bids: readonly DepthLevel[]; asks: readonly DepthLevel[]; spread?: string | undefined; loading?: boolean | undefined }>();
const precision = defineModel<number>('precision', { required: true });

const levelsPerSide = 10;
const skeletonWidths = ['88px', '64px', '96px', '72px', '56px', '92px', '60px', '84px'];
const bids = computed(() => nearestLevels(props.bids, 'bid', levelsPerSide));
const asks = computed(() => nearestLevels(props.asks, 'ask', levelsPerSide));
const empty = computed(() => bids.value.length === 0 && asks.value.length === 0);
const stepLabel = (step: string) => formatDecimal(step, Math.max(0, step.split('.')[1]?.length ?? 0));
</script>

<template>
  <section class="market-book" aria-labelledby="book-title">
    <div class="market-section-head">
      <h2 id="book-title" class="lt-panel-title">Livro de ofertas</h2>
      <label class="market-precision">
        Agrupar
        <select v-model.number="precision" class="market-select">
          <option v-for="option in depthPrecisions" :key="option.value" :value="option.value">{{ stepLabel(option.step) }}</option>
        </select>
      </label>
    </div>
    <div v-if="props.loading" class="lt-panel market-book-skeleton" aria-busy="true" aria-label="Carregando livro de ofertas">
      <div class="market-skeleton-head"></div>
      <div v-for="(width, index) in skeletonWidths" :key="index" class="market-skeleton-row">
        <span class="lt-skeleton" :style="{ width: '72px' }"></span>
        <span class="lt-skeleton" :style="{ width }"></span>
      </div>
    </div>
    <div v-else-if="empty" class="lt-empty market-book-empty">
      <p class="lt-empty-title">Livro vazio</p>
      <p class="lt-muted market-empty-detail">Ninguém tem ordem aberta neste mercado agora. A sua pode ser a primeira.</p>
    </div>
    <LtOrderBook v-else class="market-book-table" :bids="bids" :asks="asks" :base="props.market.base" :quote="props.market.quote" :spread="props.spread" />
  </section>
</template>
