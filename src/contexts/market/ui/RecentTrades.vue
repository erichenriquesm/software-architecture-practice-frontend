<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import type { Market } from '@/entities/market';
import { sideLabels } from '@/entities/order';
import { decimalsOfAsset, formatDecimal, useFitCount } from '@/lastro';
import { useNow } from '../application/useNow';
import { isJustNow } from '../domain/age';
import type { Trade } from '../domain/marketData';

const props = defineProps<{ market: Market; trades: readonly Trade[]; loading?: boolean | undefined }>();

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const timeOf = (timestamp: string) => timeFormat.format(new Date(timestamp));
const marks = { buy: '▲', sell: '▼' } as const;
const now = useNow();
/** Rows of 26 px under a 28 px column head (heights fixed in market.css): the newest trades that fit, never a scrollbar. */
const body = useTemplateRef<HTMLElement>('body');
const rows = useFitCount(body, 26, { reservedPx: 28, min: 1 });
const visible = computed(() => props.trades.slice(0, rows.value));
const skeletonRows = computed(() => Math.min(8, rows.value + 1));
</script>

<template>
  <section class="lt-panel market-trades" aria-labelledby="trades-title">
    <header class="market-panel-head market-trades-head">
      <div class="market-panel-titles">
        <p class="lt-eyebrow">Fita</p>
        <h2 id="trades-title" class="lt-panel-title">Últimas negociações</h2>
      </div>
    </header>
    <div ref="body" class="market-trades-body">
      <div v-if="props.loading && props.trades.length === 0" class="market-trades-skeleton" aria-busy="true" aria-label="Carregando negociações">
        <div v-for="row in skeletonRows" :key="row" class="market-skeleton-row">
          <span class="lt-skeleton" style="width: 56px"></span>
          <span class="lt-skeleton" style="width: 64px"></span>
          <span class="lt-skeleton" style="width: 72px"></span>
          <span class="lt-skeleton" style="width: 80px"></span>
        </div>
      </div>
      <p v-else-if="props.trades.length === 0" class="lt-muted market-trades-empty">Nenhuma negociação neste mercado ainda.</p>
      <div v-else class="market-trades-fit">
        <table class="market-trades-table">
          <thead>
            <tr>
              <th scope="col">Horário</th>
              <th scope="col">Operação</th>
              <th scope="col" class="is-num">Preço<span class="market-trades-unit"> ({{ props.market.quote }})</span></th>
              <th scope="col" class="is-num">Quantidade<span class="market-trades-unit"> ({{ props.market.base }})</span></th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" enter-active-class="market-trade-enter" move-class="market-trade-move">
            <tr v-for="trade in visible" :key="trade.tradeId" :class="`market-trade-row is-${trade.side}`">
              <td class="lt-num lt-muted">
                <span v-if="isJustNow(trade.timestamp, now)" class="market-trade-now">agora</span>
                <time v-else :datetime="trade.timestamp">{{ timeOf(trade.timestamp) }}</time>
              </td>
              <td :class="`market-trade-${trade.side}`"><span aria-hidden="true">{{ marks[trade.side] }}</span> {{ sideLabels[trade.side] }}</td>
              <td :class="['lt-num', 'is-num', `market-trade-${trade.side}`]">{{ formatDecimal(trade.price, decimalsOfAsset(props.market.quote)) }}</td>
              <td class="lt-num is-num">{{ formatDecimal(trade.quantity, decimalsOfAsset(props.market.base)) }}</td>
            </tr>
          </TransitionGroup>
        </table>
      </div>
    </div>
  </section>
</template>
