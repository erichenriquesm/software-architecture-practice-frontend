<script setup lang="ts">
import type { Market } from '@/entities/market';
import { LtPriceTicker, decimalsOfAsset, formatDecimal } from '@/lastro';
import type { MarketSummary } from '../domain/marketData';

const props = defineProps<{ market: Market; summary?: MarketSummary | undefined; lastPrice?: string | undefined }>();

const quoteAmount = (value: string | undefined) => (value === undefined ? '–' : formatDecimal(value, decimalsOfAsset(props.market.quote)));
</script>

<template>
  <section class="market-header" aria-label="Resumo do mercado">
    <LtPriceTicker :market-id="props.market.marketId" :price="props.lastPrice" :quote="props.market.quote" />
    <dl class="market-stats">
      <div class="market-stat">
        <dt class="lt-eyebrow">Máxima 24h</dt>
        <dd class="lt-num">{{ quoteAmount(props.summary?.max) }}</dd>
      </div>
      <div class="market-stat">
        <dt class="lt-eyebrow">Mínima 24h</dt>
        <dd class="lt-num">{{ quoteAmount(props.summary?.min) }}</dd>
      </div>
      <div class="market-stat">
        <dt class="lt-eyebrow">Volume 24h</dt>
        <dd class="lt-num">{{ props.summary ? `${formatDecimal(props.summary.volume, decimalsOfAsset(props.market.base))} ${props.market.base}` : '–' }}</dd>
      </div>
      <div class="market-stat">
        <dt class="lt-eyebrow">Spread</dt>
        <dd class="lt-num">{{ quoteAmount(props.summary?.spread) }}</dd>
      </div>
    </dl>
  </section>
</template>
