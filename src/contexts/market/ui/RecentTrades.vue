<script setup lang="ts">
import type { Market } from '@/entities/market';
import { sideLabels } from '@/entities/order';
import { decimalsOfAsset, formatDecimal } from '@/lastro';
import type { Trade } from '../domain/marketData';

const props = defineProps<{ market: Market; trades: readonly Trade[] }>();

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const timeOf = (timestamp: string) => timeFormat.format(new Date(timestamp));
const marks = { buy: '▲', sell: '▼' } as const;
</script>

<template>
  <section class="lt-panel market-trades" aria-labelledby="trades-title">
    <h2 id="trades-title" class="lt-panel-title market-trades-title">Últimas negociações</h2>
    <p v-if="props.trades.length === 0" class="lt-muted market-trades-empty">Nenhuma negociação neste mercado ainda.</p>
    <div v-else class="market-trades-scroll">
      <table class="market-trades-table">
        <thead>
          <tr>
            <th scope="col">Horário</th>
            <th scope="col">Operação</th>
            <th scope="col" class="is-num">Preço ({{ props.market.quote }})</th>
            <th scope="col" class="is-num">Quantidade ({{ props.market.base }})</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in props.trades" :key="trade.tradeId">
            <td class="lt-num lt-muted">{{ timeOf(trade.timestamp) }}</td>
            <td :class="`market-trade-${trade.side}`"><span aria-hidden="true">{{ marks[trade.side] }}</span> {{ sideLabels[trade.side] }}</td>
            <td class="lt-num is-num">{{ formatDecimal(trade.price, decimalsOfAsset(props.market.quote)) }}</td>
            <td class="lt-num is-num">{{ formatDecimal(trade.quantity, decimalsOfAsset(props.market.base)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
