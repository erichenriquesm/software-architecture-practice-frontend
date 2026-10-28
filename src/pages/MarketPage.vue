<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '@/contexts/identity';
import { DepthChart, MarketDataNotice, MarketHeader, MarketNotFound, OrderBookPanel, RecentTrades, marketQueryKey, useMarket } from '@/contexts/market';
import { ordersQueryKey } from '@/contexts/orders';
import { OrderTicket } from '@/contexts/orderTicket';
import { balancesQueryKey, useBalances } from '@/contexts/wallet';
import { LtSegmented, useMediaQuery } from '@/lastro';

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

/** Up to a narrow tablet the terminal shows one panel at a time behind tabs; wider, all of them side by side. */
const compact = useMediaQuery('(max-width: 900px)');
type Panel = 'book' | 'chart' | 'trades' | 'ticket';
const panels: ReadonlyArray<{ value: Panel; label: string }> = [
  { value: 'book', label: 'Livro' },
  { value: 'chart', label: 'Gráfico' },
  { value: 'trades', label: 'Negócios' },
  { value: 'ticket', label: 'Ordem' },
];
const panel = ref<Panel>('book');
const shows = (name: Panel) => !compact.value || panel.value === name;
const panelAttrs = (name: Panel) => (compact.value ? { role: 'tabpanel', id: `market-panel-${name}`, 'aria-labelledby': `market-tab-${name}` } : {});

const ticket = useTemplateRef<InstanceType<typeof OrderTicket>>('ticket');
/** A price clicked in the book becomes the ticket's limit price; behind tabs, the ticket comes up to show it. */
const pickPrice = async (price: string) => {
  if (compact.value && panel.value !== 'ticket') {
    panel.value = 'ticket';
    await nextTick();
  }
  ticket.value?.setPrice(price);
};

const refreshAfterPlacing = () => {
  void queryClient.invalidateQueries({ queryKey: marketQueryKey(marketId.value) });
  void queryClient.invalidateQueries({ queryKey: ordersQueryKey });
  if (accountId.value) void queryClient.invalidateQueries({ queryKey: balancesQueryKey(accountId.value) });
};
</script>

<template>
  <main :class="['page', 'market-page', { 'is-compact': compact }]">
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
      <LtSegmented v-if="compact" v-model="panel" class="market-tabs" :options="panels" label="Painéis do mercado" id-prefix="market" />
      <div class="market-terminal">
        <div v-show="shows('book')" class="market-slot market-slot-book lt-rise lt-rise-1" v-bind="panelAttrs('book')">
          <OrderBookPanel
            v-model:precision="precision"
            :market="market"
            :bids="view.book.value.bids"
            :asks="view.book.value.asks"
            :spread="view.spread.value"
            :last-price="view.lastPrice.value"
            :loading="view.bookLoading.value"
            @pick="pickPrice"
          />
        </div>
        <div v-show="shows('chart')" class="market-slot market-slot-chart lt-rise lt-rise-2" v-bind="panelAttrs('chart')">
          <DepthChart :market="market" :bids="view.exactBook.value.bids" :asks="view.exactBook.value.asks" :loading="view.depthLoading.value" />
        </div>
        <div v-show="shows('trades')" class="market-slot market-slot-trades lt-rise lt-rise-3" v-bind="panelAttrs('trades')">
          <RecentTrades :market="market" :trades="view.trades.value" :loading="view.tradesLoading.value" />
        </div>
        <div v-show="shows('ticket')" class="market-slot market-slot-ticket lt-rise lt-rise-4" v-bind="panelAttrs('ticket')">
          <OrderTicket
            ref="ticket"
            :key="market.marketId"
            :market="market"
            :available="available"
            :best-bid="view.bestBid.value"
            :best-ask="view.bestAsk.value"
            @placed="refreshAfterPlacing"
          />
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
/* One viewport: the ticker strip on top, the terminal takes the rest and every panel stretches to fill it */
.market-page { height: 100%; display: flex; flex-direction: column; gap: var(--space-4); }
.market-page > * { flex: 0 0 auto; min-width: 0; }
.market-page > .market-terminal { flex: 1 1 auto; min-height: 0; }
.market-terminal {
  display: grid; gap: var(--space-4);
  grid-template-columns: minmax(0, 340px) minmax(0, 1fr) minmax(0, 340px);
  grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr);
  grid-template-areas: 'book chart ticket' 'book trades ticket';
}
.market-slot { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.market-slot > * { flex: 1 1 auto; min-height: 0; }
.market-slot-book { grid-area: book; }
.market-slot-chart { grid-area: chart; }
.market-slot-trades { grid-area: trades; }
.market-slot-ticket { grid-area: ticket; }
@media (max-width: 1180px) {
  .market-terminal { grid-template-columns: minmax(0, 280px) minmax(0, 1fr) minmax(0, 300px); }
}
@media (max-height: 800px) {
  .market-page { gap: var(--space-3); }
  .market-terminal { gap: var(--space-3); }
}
/* Behind tabs: one panel at a time, filling everything under the tabs */
.market-page.is-compact { gap: var(--space-2); }
.market-page.is-compact .market-terminal { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); grid-template-areas: 'panel'; }
.market-page.is-compact .market-slot { grid-area: panel; }
</style>
