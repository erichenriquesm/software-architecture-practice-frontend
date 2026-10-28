<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { computed, useTemplateRef } from 'vue';
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

const ticket = useTemplateRef<InstanceType<typeof OrderTicket>>('ticket');
/** A price clicked in the book becomes the ticket's limit price. */
const pickPrice = (price: string) => ticket.value?.setPrice(price);

const refreshAfterPlacing = () => {
  void queryClient.invalidateQueries({ queryKey: marketQueryKey(marketId.value) });
  void queryClient.invalidateQueries({ queryKey: ordersQueryKey });
  if (accountId.value) void queryClient.invalidateQueries({ queryKey: balancesQueryKey(accountId.value) });
};
</script>

<template>
  <main class="page market-page">
    <MarketNotFound v-if="view.notFound.value || !market" :market-id="marketId" />
    <template v-else>
      <h1 class="lt-visually-hidden">Mercado {{ market.marketId }}</h1>
      <MarketHeader
        class="lt-rise"
        :market="market"
        :summary="view.summary.value"
        :last-price="view.lastPrice.value"
        :trades="view.trades.value"
        :changed-at="view.changedAt.value"
        :delayed="view.delayed.value"
        :loading="view.summaryLoading.value || view.tradesLoading.value"
      />
      <MarketDataNotice v-if="view.delayed.value" :rate-limited="view.rateLimited.value" @retry="view.retryNow" />
      <div class="market-terminal">
        <OrderBookPanel
          v-model:precision="precision"
          class="market-terminal-book lt-rise lt-rise-1"
          :market="market"
          :bids="view.book.value.bids"
          :asks="view.book.value.asks"
          :spread="view.spread.value"
          :last-price="view.lastPrice.value"
          :loading="view.bookLoading.value"
          @pick="pickPrice"
        />
        <div class="market-terminal-center">
          <DepthChart class="lt-rise lt-rise-2" :market="market" :bids="view.exactBook.value.bids" :asks="view.exactBook.value.asks" :loading="view.depthLoading.value" />
          <RecentTrades class="lt-rise lt-rise-3" :market="market" :trades="view.trades.value" :loading="view.tradesLoading.value" />
        </div>
        <OrderTicket
          ref="ticket"
          :key="market.marketId"
          class="market-terminal-ticket lt-rise lt-rise-4"
          :market="market"
          :available="available"
          :best-bid="view.bestBid.value"
          :best-ask="view.bestAsk.value"
          @placed="refreshAfterPlacing"
        />
      </div>
    </template>
  </main>
</template>

<style scoped>
.market-page { max-width: 1480px; gap: var(--space-4); }
.market-page > *, .market-terminal > * { min-width: 0; }
.market-terminal {
  display: grid; gap: var(--space-4); align-items: start;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr) minmax(300px, 340px);
  grid-template-areas: 'book center ticket';
}
.market-terminal-book { grid-area: book; }
.market-terminal-center { grid-area: center; min-width: 0; display: grid; gap: var(--space-4); }
.market-terminal-ticket { grid-area: ticket; position: sticky; top: 72px; }
@media (max-width: 1180px) {
  .market-terminal { grid-template-columns: minmax(280px, 1fr) minmax(300px, 1fr); grid-template-areas: 'book ticket' 'center center'; }
}
@media (max-width: 720px) {
  .market-terminal { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'book' 'ticket' 'center'; }
  .market-terminal-ticket { position: static; }
}
</style>
