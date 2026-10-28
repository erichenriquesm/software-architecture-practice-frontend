<script setup lang="ts">
import { computed } from 'vue';
import type { Market } from '@/entities/market';
import { decimalsOfAsset, formatDecimal } from '@/lastro';
import { depthChartGeometry } from '../domain/depthChart';
import type { DepthLevel } from '../domain/marketData';

const props = defineProps<{ market: Market; bids: readonly DepthLevel[]; asks: readonly DepthLevel[] }>();

const frame = { left: 48, right: 630, top: 10, bottom: 190, gap: 10 } as const;
const geometry = computed(() => depthChartGeometry(props.bids, props.asks, frame));
const empty = computed(() => geometry.value.bidPoints === '' && geometry.value.askPoints === '');

const price = (value: string | undefined, decimals = 0) => (value === undefined ? '–' : formatDecimal(value, decimals));
const quantity = (value: string | undefined) => (value === undefined ? '0' : formatDecimal(value, 2));
const axis = computed(() => ({ top: quantity(geometry.value.maxCumulative), middle: quantity(geometry.value.halfCumulative) }));

const label = computed(() => {
  const { bidTotal, askTotal, bestBid, bestAsk } = geometry.value;
  const base = props.market.base;
  const parts = [
    bestBid === undefined ? 'sem compras' : `compras até ${formatDecimal(bidTotal ?? '0', decimalsOfAsset(base))} ${base} a partir de ${price(bestBid, 2)}`,
    bestAsk === undefined ? 'sem vendas' : `vendas até ${formatDecimal(askTotal ?? '0', decimalsOfAsset(base))} ${base} a partir de ${price(bestAsk, 2)}`,
  ];
  return `Profundidade acumulada: ${parts.join(', ')}`;
});
</script>

<template>
  <div class="lt-panel market-depth">
    <div class="market-section-head">
      <h2 id="depth-title" class="lt-panel-title">Profundidade</h2>
      <span class="market-legend">
        <span><span class="market-legend-bid" aria-hidden="true">■</span> Compras</span>
        <span><span class="market-legend-ask" aria-hidden="true">■</span> Vendas</span>
      </span>
    </div>
    <p v-if="empty" class="lt-muted market-empty-detail">Sem ofertas no livro para desenhar a profundidade.</p>
    <svg v-else class="market-depth-chart" viewBox="0 0 640 220" role="img" :aria-label="label">
      <line class="market-depth-axis" :x1="frame.left" :y1="frame.bottom" :x2="frame.right" :y2="frame.bottom" />
      <line class="market-depth-grid" :x1="frame.left" :y1="(frame.top + frame.bottom) / 2" :x2="frame.right" :y2="(frame.top + frame.bottom) / 2" />
      <line class="market-depth-grid" :x1="frame.left" :y1="frame.top" :x2="frame.right" :y2="frame.top" />
      <polygon v-if="geometry.bidPoints" class="market-depth-bid" :points="geometry.bidPoints" />
      <polygon v-if="geometry.askPoints" class="market-depth-ask" :points="geometry.askPoints" />
      <text class="market-depth-label" :x="frame.left - 8" :y="frame.bottom + 4" text-anchor="end">0</text>
      <text class="market-depth-label" :x="frame.left - 8" :y="(frame.top + frame.bottom) / 2 + 4" text-anchor="end">{{ axis.middle }}</text>
      <text class="market-depth-label" :x="frame.left - 8" :y="frame.top + 4" text-anchor="end">{{ axis.top }}</text>
      <text class="market-depth-label" :x="frame.left" y="212">{{ price(geometry.lowestBid) }}</text>
      <text class="market-depth-label is-strong" :x="(frame.left + frame.right) / 2" y="212" text-anchor="middle">{{ price(geometry.bestBid, 2) }} | {{ price(geometry.bestAsk, 2) }}</text>
      <text class="market-depth-label" :x="frame.right" y="212" text-anchor="end">{{ price(geometry.highestAsk) }}</text>
    </svg>
  </div>
</template>
