<script setup lang="ts">
import { computed, useId } from 'vue';
import type { Market } from '@/entities/market';
import { LtHelp, decimalsOfAsset, formatDecimal, useFlash } from '@/lastro';
import { useNow } from '../application/useNow';
import { ageOf, secondsSince } from '../domain/age';
import type { MarketSummary, Trade } from '../domain/marketData';
import { rangePosition, sparklineOf } from '../domain/sparkline';

const props = defineProps<{
  market: Market;
  summary?: MarketSummary | undefined;
  lastPrice?: string | undefined;
  trades?: readonly Trade[] | undefined;
  changedAt?: string | undefined;
  delayed?: boolean | undefined;
  loading?: boolean | undefined;
}>();

const quoteDecimals = computed(() => decimalsOfAsset(props.market.quote));
const quoteAmount = (value: string | undefined) => (value === undefined ? '–' : formatDecimal(value, quoteDecimals.value));

const { flashClass, direction, flashKey } = useFlash(() => props.lastPrice);

const spark = { width: 220, height: 48, inset: 5 } as const;
const gradientId = `market-spark-${useId()}`;
const sparkline = computed(() => sparklineOf([...(props.trades ?? [])].reverse().map((trade) => trade.price), spark));
const change = computed(() => {
  const percent = sparkline.value.changePercent;
  if (percent === undefined) return undefined;
  const sign = sparkline.value.trend === 'up' ? '+' : '';
  return `${sign}${formatDecimal(percent, 2)}%`;
});
const tradeCount = computed(() => props.trades?.length ?? 0);

const range = computed(() => rangePosition(props.summary?.min, props.summary?.max, props.lastPrice));

const now = useNow();
const freshness = computed(() => {
  if (props.delayed) return 'Dados atrasados';
  if (props.changedAt === undefined) return 'Ao vivo';
  const seconds = secondsSince(props.changedAt, now.value);
  if (seconds < 2) return 'Livro mudou agora';
  const age = ageOf(seconds);
  return `Livro mudou há ${age.value} ${age.unit}`;
});
</script>

<template>
  <section class="lt-panel market-header" aria-label="Resumo do mercado">
    <div class="market-ticker">
      <div class="market-pair">
        <span class="market-pair-mark" aria-hidden="true">{{ props.market.base.slice(0, 1) }}</span>
        <span class="market-pair-name">{{ props.market.base }}<span class="market-pair-quote">/{{ props.market.quote }}</span></span>
        <span class="market-pair-tag">Spot</span>
      </div>
      <div class="market-last-line">
        <span v-if="props.loading && props.lastPrice === undefined" class="lt-skeleton market-last-skeleton" aria-hidden="true"></span>
        <span v-else :key="flashKey" :class="['market-last', flashClass, direction ? `is-${direction}` : '']">
          <span v-if="direction" class="market-last-arrow" aria-hidden="true">{{ direction === 'up' ? '▲' : '▼' }}</span>{{ quoteAmount(props.lastPrice) }}<span class="lt-unit">{{ props.market.quote }}</span>
        </span>
        <span class="lt-visually-hidden">Último preço {{ quoteAmount(props.lastPrice) }} {{ props.market.quote }}</span>
        <LtHelp title="Último preço" text="Preço da negociação mais recente entre um comprador e um vendedor." placement="bottom" />
      </div>
    </div>

    <dl class="market-stats">
      <div class="market-stat market-stat-range">
        <dt class="lt-eyebrow">Faixa 24h<LtHelp title="Faixa 24h" text="O menor e o maior preço negociados nas últimas 24 horas. O marcador mostra onde está o último preço." placement="bottom" /></dt>
        <dd class="lt-num">
          <span class="market-range-ends">
            <span><span class="lt-visually-hidden">Mínima </span>{{ quoteAmount(props.summary?.min) }}</span>
            <span><span class="lt-visually-hidden">Máxima </span>{{ quoteAmount(props.summary?.max) }}</span>
          </span>
          <span class="market-range" aria-hidden="true">
            <span v-if="range !== undefined" class="market-range-marker" :style="{ left: `${range}%` }"></span>
          </span>
        </dd>
      </div>
      <div class="market-stat">
        <dt class="lt-eyebrow">Volume 24h<LtHelp title="Volume 24h" :text="`Quanto dinheiro (em ${props.market.quote}) trocou de mão nas últimas 24 horas.`" placement="bottom" /></dt>
        <dd class="lt-num">{{ quoteAmount(props.summary?.volume) }} <span class="lt-unit">{{ props.market.quote }}</span></dd>
      </div>
      <div class="market-stat">
        <dt class="lt-eyebrow">Spread<LtHelp title="Spread" text="A diferença entre a venda mais barata e a compra mais cara no livro. Quanto menor, mais fácil negociar perto do preço justo." placement="bottom" /></dt>
        <dd class="lt-num">{{ quoteAmount(props.summary?.spread) }}</dd>
      </div>
    </dl>

    <figure v-if="sparkline.line" :class="['market-spark', `is-${sparkline.trend}`]">
      <svg :viewBox="`0 0 ${spark.width} ${spark.height}`" :width="spark.width" :height="spark.height" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" class="market-spark-stop" stop-opacity="0.35" />
            <stop offset="100%" class="market-spark-stop" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path :d="sparkline.area" :fill="`url(#${gradientId})`" />
        <path :d="sparkline.line" class="market-spark-line" />
        <template v-if="sparkline.end">
          <circle :key="flashKey" :cx="sparkline.end.x" :cy="sparkline.end.y" r="2.5" class="market-spark-ping" />
          <circle :cx="sparkline.end.x" :cy="sparkline.end.y" r="2.5" class="market-spark-dot" />
        </template>
      </svg>
      <figcaption class="market-spark-caption">
        <span v-if="change" :class="['lt-num', 'market-change', `is-${sparkline.trend}`]">{{ change }}</span>
        <span class="lt-muted">nas últimas {{ tradeCount }} negociações</span>
      </figcaption>
    </figure>

    <p :class="['market-live', { 'is-delayed': props.delayed }]">
      <span :class="props.delayed ? 'market-live-dot-off' : 'lt-live-dot'" aria-hidden="true"></span>
      <span class="market-live-text">{{ freshness }}</span>
    </p>
  </section>
</template>
