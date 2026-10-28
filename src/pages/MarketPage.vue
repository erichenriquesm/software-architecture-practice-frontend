<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '@/contexts/identity';
import { DepthChart, MarketDataNotice, MarketHeader, MarketNotFound, OrderBookPanel, RecentTrades, marketQueryKey, useMarket } from '@/contexts/market';
import { ordersQueryKey } from '@/contexts/orders';
import { OrderTicket } from '@/contexts/orderTicket';
import { balancesQueryKey, useBalances } from '@/contexts/wallet';

const route = useRoute();
const marketId = computed(() => String(route.params.marketId ?? ''));
const session = useSessionStore();
const accountId = computed(() => session.user?.accountId);
const queryClient = useQueryClient();

const view = useMarket(marketId);
const { market, precision } = view;
const wallet = useBalances(accountId);
const available = computed(() => {
  if (wallet.isLoading.value || !market.value) return undefined;
  return { [market.value.base]: wallet.availableOf(market.value.base), [market.value.quote]: wallet.availableOf(market.value.quote) };
});

const refreshAfterPlacing = () => {
  void queryClient.invalidateQueries({ queryKey: marketQueryKey(marketId.value) });
  void queryClient.invalidateQueries({ queryKey: ordersQueryKey });
  if (accountId.value) void queryClient.invalidateQueries({ queryKey: balancesQueryKey(accountId.value) });
};
</script>

<template>
  <main class="page">
    <MarketNotFound v-if="view.notFound.value || !market" :market-id="marketId" />
    <template v-else>
      <h1 class="lt-visually-hidden">Mercado {{ market.marketId }}</h1>
      <MarketHeader :market="market" :summary="view.summary.value" :last-price="view.lastPrice.value" />
      <MarketDataNotice v-if="view.delayed.value" :rate-limited="view.rateLimited.value" @retry="view.retryNow" />
      <div class="market-layout">
        <OrderBookPanel v-model:precision="precision" class="market-layout-book" :market="market" :bids="view.book.value.bids" :asks="view.book.value.asks" :spread="view.spread.value" :loading="view.bookLoading.value" />
        <section class="market-layout-center" aria-labelledby="depth-title">
          <DepthChart :market="market" :bids="view.exactBook.value.bids" :asks="view.exactBook.value.asks" />
          <RecentTrades :market="market" :trades="view.trades.value" />
        </section>
        <OrderTicket :key="market.marketId" class="market-layout-ticket" :market="market" :available="available" :best-bid="view.bestBid.value" :best-ask="view.bestAsk.value" @placed="refreshAfterPlacing" />
      </div>
    </template>
  </main>
</template>

<style scoped>
.market-layout { display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-start; }
.market-layout-book { flex: 1 1 280px; max-width: 360px; }
.market-layout-center { flex: 999 1 420px; min-width: 0; display: grid; gap: var(--space-6); }
.market-layout-ticket { flex: 1 1 280px; max-width: 340px; }
@media (max-width: 720px) {
  .market-layout-book, .market-layout-ticket { max-width: none; }
}
</style>
