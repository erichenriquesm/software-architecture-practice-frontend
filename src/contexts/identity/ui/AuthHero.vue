<script setup lang="ts">
import { computed } from 'vue';
import { formatDecimal, useFlash } from '@/lastro';
import { useMarketPreview } from '../application/useMarketPreview';

const { marketId, book, lastTrade, recentTrades, loading, live } = useMarketPreview();
const { flashClass, direction, flashKey } = useFlash(() => lastTrade.value?.price);

const price = (value: string) => formatDecimal(value, 2);
const size = (value: string) => formatDecimal(value, 5);
const marks = { buy: '▲', sell: '▼' } as const;
const skeletonRows = [1, 2, 3, 4, 5];

const summary = computed(() => {
  const last = lastTrade.value ? `Último preço ${price(lastTrade.value.price)} USD.` : 'Ainda sem negociações.';
  const bestBid = book.value.bids[0];
  const bestAsk = book.value.asks.at(-1);
  return `${marketId}: ${last} Melhor compra ${bestBid ? price(bestBid.price) : 'nenhuma'}, melhor venda ${bestAsk ? price(bestAsk.price) : 'nenhuma'}.`;
});
</script>

<template>
  <section class="auth-hero" aria-labelledby="auth-hero-headline">
    <div class="auth-hero-backdrop" aria-hidden="true"></div>

    <div class="auth-brand">
      <span class="auth-brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
      Lastro
    </div>

    <div class="auth-hero-copy lt-rise">
      <p class="lt-eyebrow auth-hero-eyebrow">Corretora de BTC · ordem limitada</p>
      <p id="auth-hero-headline" class="auth-hero-headline">Compre e venda BTC com ordem limitada. <span class="auth-hero-accent">Você define o preço.</span></p>
      <p class="auth-hero-lede">Sua ordem espera no livro até alguém aceitar o seu preço. Enquanto isso, só o valor dela fica reservado.</p>
    </div>

    <figure class="auth-live lt-rise lt-rise-2">
      <figcaption class="lt-visually-hidden">{{ summary }}</figcaption>
      <div class="auth-live-head" aria-hidden="true">
        <span class="auth-live-market">{{ marketId }}</span>
        <span :class="['auth-live-state', { 'is-live': live }]">
          <span :class="live ? 'lt-live-dot' : 'auth-live-dot-off'"></span>
          {{ live ? 'ao vivo' : loading ? 'conectando' : 'sem conexão' }}
        </span>
      </div>

      <div class="auth-live-price" aria-hidden="true">
        <span :key="flashKey" :class="['auth-live-last', flashClass, direction ? `is-${direction}` : '']">
          <span v-if="direction" class="auth-live-mark">{{ direction === 'up' ? '▲' : '▼' }}</span>{{ lastTrade ? price(lastTrade.price) : '–' }}
        </span>
        <span class="auth-live-unit">USD · último preço</span>
      </div>

      <div class="auth-book" aria-hidden="true">
        <div class="auth-book-head"><span>Preço</span><span>Quantidade</span></div>
        <template v-if="loading">
          <div v-for="row in skeletonRows" :key="`ask-${row}`" class="auth-book-row"><span class="lt-skeleton auth-book-skeleton"></span></div>
        </template>
        <template v-else>
          <p v-if="book.asks.length === 0" class="auth-book-none">Sem ofertas de venda agora</p>
          <div v-for="row in book.asks" :key="`ask-${row.price}`" class="auth-book-row is-ask">
            <span class="auth-book-bar" :style="{ width: `${row.depth}%` }"></span>
            <span class="auth-book-price">{{ price(row.price) }}</span>
            <span class="auth-book-qty">{{ size(row.quantity) }}</span>
          </div>
        </template>

        <div class="auth-book-spread">
          <span>spread</span><span class="lt-num">{{ book.spread === undefined ? '–' : price(book.spread) }}</span>
        </div>

        <template v-if="loading">
          <div v-for="row in skeletonRows" :key="`bid-${row}`" class="auth-book-row"><span class="lt-skeleton auth-book-skeleton"></span></div>
        </template>
        <template v-else>
          <div v-for="row in book.bids" :key="`bid-${row.price}`" class="auth-book-row is-bid">
            <span class="auth-book-bar" :style="{ width: `${row.depth}%` }"></span>
            <span class="auth-book-price">{{ price(row.price) }}</span>
            <span class="auth-book-qty">{{ size(row.quantity) }}</span>
          </div>
          <p v-if="book.bids.length === 0" class="auth-book-none">Sem ofertas de compra agora</p>
        </template>
      </div>

      <TransitionGroup v-if="recentTrades.length > 0" tag="ol" name="lt-row" class="auth-trades" aria-hidden="true">
        <li v-for="trade in recentTrades" :key="trade.tradeId" :class="`is-${trade.side}`">
          <span class="auth-trades-side">{{ marks[trade.side] }}</span>
          <span class="lt-num auth-trades-price">{{ price(trade.price) }}</span>
          <span class="lt-num auth-trades-qty">{{ size(trade.quantity) }} BTC</span>
        </li>
      </TransitionGroup>
    </figure>
  </section>
</template>
