<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from 'vue';
import type { Market } from '@/entities/market';
import { decimalsOfAsset, formatDecimal } from '@/lastro';
import { useElementSize } from '../application/useElementSize';
import { depthChartGeometry, depthPriceAt, depthStepAt } from '../domain/depthChart';
import type { DepthStep } from '../domain/depthChart';
import type { DepthLevel } from '../domain/marketData';

const props = defineProps<{ market: Market; bids: readonly DepthLevel[]; asks: readonly DepthLevel[]; loading?: boolean | undefined }>();

/** The chart is drawn at the size of its box, so it fills whatever height the layout gives it without stretching the text. */
const plot = useTemplateRef<HTMLElement>('plot');
const view = useElementSize(plot, { width: 640, height: 260 });
const frame = computed(() => ({ left: 56, right: view.value.width - 12, top: 30, bottom: Math.max(60, view.value.height - 38), gap: 8 }));
const geometry = computed(() => depthChartGeometry(props.bids, props.asks, frame.value));
const empty = computed(() => geometry.value.bidArea === '' && geometry.value.askArea === '');
/** A new shape gets a new key, so the old one fades out while the new one fades in. */
const shapeKey = computed(() => `${geometry.value.bidArea}|${geometry.value.askArea}`);
const ids = { bid: `depth-bid-${useId()}`, ask: `depth-ask-${useId()}` };

const quoteDecimals = computed(() => decimalsOfAsset(props.market.quote));
const price = (value: string | undefined, decimals = 0) => (value === undefined ? '–' : formatDecimal(value, decimals));
const quantity = (value: string | undefined) => (value === undefined ? '0' : formatDecimal(value, 2));
const axis = computed(() => ({ top: quantity(geometry.value.maxCumulative), middle: quantity(geometry.value.halfCumulative) }));
const middleY = computed(() => (frame.value.top + frame.value.bottom) / 2);

const label = computed(() => {
  const { bidTotal, askTotal, bestBid, bestAsk } = geometry.value;
  const base = props.market.base;
  const parts = [
    bestBid === undefined ? 'sem compras' : `compras até ${formatDecimal(bidTotal ?? '0', decimalsOfAsset(base))} ${base} a partir de ${price(bestBid, 2)}`,
    bestAsk === undefined ? 'sem vendas' : `vendas até ${formatDecimal(askTotal ?? '0', decimalsOfAsset(base))} ${base} a partir de ${price(bestAsk, 2)}`,
  ];
  return `Profundidade acumulada: ${parts.join(', ')}`;
});

/** Pointer-only crosshair: keyboard and screen reader users get the summary in the label instead. */
const pointer = ref<{ x: number; step: DepthStep } | undefined>(undefined);
const track = (event: PointerEvent) => {
  const svg = event.currentTarget as SVGSVGElement;
  const box = svg.getBoundingClientRect();
  if (box.width === 0) return;
  const x = Math.min(frame.value.right, Math.max(frame.value.left, ((event.clientX - box.left) / box.width) * view.value.width));
  const step = depthStepAt(geometry.value, x);
  pointer.value = step ? { x, step } : undefined;
};
const tooltip = computed(() => {
  if (!pointer.value) return undefined;
  const { x, step } = pointer.value;
  const scale = geometry.value.scales[step.side];
  return {
    side: step.side,
    title: step.side === 'bid' ? 'Compras' : 'Vendas',
    price: formatDecimal(scale ? depthPriceAt(scale, x, props.market.tickSize) : step.price, quoteDecimals.value),
    cumulative: formatDecimal(step.cumulative, decimalsOfAsset(props.market.base)),
    style: { left: `${(x / view.value.width) * 100}%`, top: `${(step.y / view.value.height) * 100}%` },
    flipped: x > view.value.width / 2,
  };
});
</script>

<template>
  <section class="lt-panel market-depth" aria-labelledby="depth-title">
    <header class="market-panel-head">
      <div class="market-panel-titles">
        <p class="lt-eyebrow">Acumulado por preço</p>
        <h2 id="depth-title" class="lt-panel-title">Profundidade</h2>
      </div>
      <span class="market-legend">
        <span><span class="market-legend-swatch is-bid" aria-hidden="true"></span>Compras</span>
        <span><span class="market-legend-swatch is-ask" aria-hidden="true"></span>Vendas</span>
      </span>
    </header>
    <div ref="plot" :class="['market-depth-plot', pointer ? `is-hover-${pointer.step.side}` : '']">
      <div v-if="props.loading && empty" class="market-depth-skeleton lt-skeleton" aria-busy="true" aria-label="Carregando profundidade"></div>
      <p v-else-if="empty" class="lt-muted market-empty-detail">Sem ofertas no livro para desenhar a profundidade.</p>
      <template v-else>
        <svg class="market-depth-chart" :viewBox="`0 0 ${view.width} ${view.height}`" role="img" :aria-label="label" @pointermove="track" @pointerleave="pointer = undefined">
          <defs>
            <linearGradient :id="ids.bid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" class="market-depth-stop-bid" stop-opacity="0.42" />
              <stop offset="100%" class="market-depth-stop-bid" stop-opacity="0.02" />
            </linearGradient>
            <linearGradient :id="ids.ask" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" class="market-depth-stop-ask" stop-opacity="0.42" />
              <stop offset="100%" class="market-depth-stop-ask" stop-opacity="0.02" />
            </linearGradient>
          </defs>

          <line class="market-depth-grid" :x1="frame.left" :y1="frame.top" :x2="frame.right" :y2="frame.top" />
          <line class="market-depth-grid" :x1="frame.left" :y1="middleY" :x2="frame.right" :y2="middleY" />
          <text class="market-depth-label" :x="frame.left - 8" :y="frame.top + 4" text-anchor="end">{{ axis.top }}</text>
          <text class="market-depth-label" :x="frame.left - 8" :y="middleY + 4" text-anchor="end">{{ axis.middle }}</text>
          <text class="market-depth-label" :x="frame.left - 8" :y="frame.bottom + 4" text-anchor="end">0</text>

          <g class="market-depth-reveal">
            <TransitionGroup tag="g" name="market-depth-fade">
              <g :key="shapeKey">
                <g class="market-depth-side is-bid">
                  <path v-if="geometry.bidArea" :d="geometry.bidArea" :fill="`url(#${ids.bid})`" />
                  <path v-if="geometry.bidLine" :d="geometry.bidLine" class="market-depth-line" />
                </g>
                <g class="market-depth-side is-ask">
                  <path v-if="geometry.askArea" :d="geometry.askArea" :fill="`url(#${ids.ask})`" />
                  <path v-if="geometry.askLine" :d="geometry.askLine" class="market-depth-line" />
                </g>
              </g>
            </TransitionGroup>
          </g>

          <line class="market-depth-axis" :x1="frame.left" :y1="frame.bottom" :x2="frame.right" :y2="frame.bottom" />
          <line class="market-depth-mid" :x1="geometry.middle" :y1="frame.top - 6" :x2="geometry.middle" :y2="frame.bottom" />
          <g v-if="geometry.midPrice" class="market-depth-mid-tag">
            <rect :x="geometry.middle - 52" :y="2" width="104" height="20" rx="3" />
            <text :x="geometry.middle" y="16" text-anchor="middle">{{ price(geometry.midPrice, 2) }}</text>
          </g>

          <text class="market-depth-label" :x="frame.left" :y="frame.bottom + 22">{{ price(geometry.lowestBid) }}</text>
          <text class="market-depth-label is-bid" :x="geometry.middle - 8" :y="frame.bottom + 22" text-anchor="end">{{ price(geometry.bestBid, 2) }}</text>
          <text class="market-depth-label is-ask" :x="geometry.middle + 8" :y="frame.bottom + 22">{{ price(geometry.bestAsk, 2) }}</text>
          <text class="market-depth-label" :x="frame.right" :y="frame.bottom + 22" text-anchor="end">{{ price(geometry.highestAsk) }}</text>

          <g v-if="pointer" class="market-depth-crosshair" aria-hidden="true">
            <line :x1="pointer.x" :y1="frame.top" :x2="pointer.x" :y2="frame.bottom" />
            <line :x1="frame.left" :y1="pointer.step.y" :x2="frame.right" :y2="pointer.step.y" />
            <circle :class="`is-${pointer.step.side}`" :cx="pointer.x" :cy="pointer.step.y" r="4" />
          </g>
        </svg>
        <div v-if="tooltip" :class="['market-depth-tip', `is-${tooltip.side}`, { 'is-flipped': tooltip.flipped }]" :style="tooltip.style" aria-hidden="true">
          <span class="market-depth-tip-title">{{ tooltip.title }}</span>
          <span class="market-depth-tip-row"><span>Preço</span><span class="lt-num">{{ tooltip.price }} {{ props.market.quote }}</span></span>
          <span class="market-depth-tip-row"><span>Acumulado</span><span class="lt-num">{{ tooltip.cumulative }} {{ props.market.base }}</span></span>
        </div>
      </template>
    </div>
  </section>
</template>
