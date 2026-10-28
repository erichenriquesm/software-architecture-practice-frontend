<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { sideLabels } from '@/entities/order';
import { LtAlert, LtButton, LtHelp, LtStatusBadge, useFitCount, useMediaQuery } from '@/lastro';
import { canCancel, fillPercentage, isLive, orderFilterLabels, orderFilters } from '../domain/order';
import type { Order, OrderFilter } from '../domain/order';
import { pageRangeLabel, pageWindow } from '../domain/pagination';
import { useCancelOrder } from '../application/useCancelOrder';
import { useOrders } from '../application/useOrders';
import OrdersEmpty from './OrdersEmpty.vue';
import { assetsOf, formatAmount, formatShortTime } from './orderFormat';

const props = defineProps<{ accountId?: string | undefined }>();
const emit = defineEmits<{ cancelled: [] }>();
const filter = ref<OrderFilter>('all');
const { orders, counts, isLoading, error, refetch } = useOrders(() => props.accountId, filter);
const { cancel, cancellingId, errorMessage } = useCancelOrder({ onCancelled: () => emit('cancelled') });

const marks = { buy: '▲', sell: '▼' } as const;
const shortFilterLabels: Readonly<Record<OrderFilter, string>> = { all: 'Todas', open: 'Abertas', filled: 'Executadas', closed: 'Canceladas' };
const showTable = computed(() => isLoading.value || orders.value.length > 0);
const cancelLabel = (order: Order) => `Cancelar ordem de ${sideLabels[order.side].toLowerCase()} criada em ${formatShortTime(order.createdAt)}`;
const countLabel = (count: number) => (count === 1 ? '1 ordem' : `${count} ordens`);

/**
 * The list never scrolls: a page holds exactly the rows (or, on phones, the cards) that fit in the space left,
 * and the pager walks through the rest. Row and card heights are fixed in orders.css.
 */
const tableRowPx = 45;
const tableHeadPx = 28;
const cardPx = 105;
const phone = useMediaQuery('(max-width: 760px)');
const statusHelp =
  'Recebida: chegou e está reservando o saldo. Aberta: está no livro esperando. Parcial: parte já foi executada. Cancelando: saindo do livro. Executada: concluída. Cancelada, Rejeitada (por exemplo, sem saldo) e Expirada: encerradas sem completar.';
const body = ref<HTMLElement>();
const rowsThatFit = useFitCount(body, tableRowPx, { reservedPx: tableHeadPx });
const cardsThatFit = useFitCount(body, cardPx);
const pageSize = computed(() => (phone.value ? cardsThatFit.value : rowsThatFit.value));
const requestedPage = ref(1);
watch(filter, () => {
  requestedPage.value = 1;
});
const pageView = computed(() => pageWindow(orders.value.length, pageSize.value, requestedPage.value));
const paged = computed(() => orders.value.slice(pageView.value.start, pageView.value.end));
const skeletonRows = computed(() => Math.min(4, pageSize.value));
const rangeLabel = computed(() => pageRangeLabel(pageView.value, orders.value.length));
const goTo = (page: number) => {
  requestedPage.value = page;
};
</script>

<template>
  <section aria-labelledby="orders-title" :class="['orders-panel', 'lt-panel', 'lt-rise', { 'is-phone': phone }]">
    <div class="orders-toolbar">
      <h2 id="orders-title" class="lt-panel-title">Minhas ordens</h2>
      <span v-if="phone" class="orders-filter-phone">
        <select v-model="filter" class="lt-select orders-filter-select" aria-label="Filtrar por status">
          <option v-for="option in orderFilters" :key="option" :value="option">{{ shortFilterLabels[option] }}{{ isLoading ? '' : ` (${counts[option]})` }}</option>
        </select>
        <LtHelp title="Status" :text="statusHelp" placement="bottom" />
      </span>
      <div v-else role="group" aria-label="Filtrar por status" class="orders-filters">
        <button
          v-for="option in orderFilters"
          :key="option"
          type="button"
          :aria-pressed="filter === option"
          :class="['orders-filter', { 'is-active': filter === option }]"
          @click="filter = option"
        >
          {{ orderFilterLabels[option] }}
          <span v-if="!isLoading" class="orders-count"><span aria-hidden="true">{{ counts[option] }}</span><span class="lt-visually-hidden">, {{ countLabel(counts[option]) }}</span></span>
        </button>
      </div>
    </div>

    <Transition name="orders-alert">
      <div v-if="errorMessage || (error && orders.length === 0)" class="orders-alerts">
        <LtAlert v-if="errorMessage" tone="danger" :title="errorMessage.title" :detail="errorMessage.detail" />
        <LtAlert v-if="error && orders.length === 0" tone="danger" title="Não foi possível carregar as ordens.">
          Tentamos de novo em instantes. Se continuar, tente agora.
          <LtButton size="sm" class="orders-retry" @click="refetch">Tentar de novo</LtButton>
        </LtAlert>
      </div>
    </Transition>

    <div ref="body" class="orders-body">
      <table v-if="showTable" class="orders-table" :aria-busy="isLoading || undefined">
        <thead>
          <tr>
            <th scope="col">Criada em</th>
            <th scope="col">Operação</th>
            <th scope="col" class="is-num">Preço limite</th>
            <th scope="col" class="is-num">Quantidade</th>
            <th scope="col" class="is-num">Executado<LtHelp v-if="!phone" title="Executado" text="Quanto da quantidade da ordem já foi negociado." placement="bottom" /></th>
            <th scope="col" class="is-num orders-cell-avg">
              Preço médio<LtHelp v-if="!phone" title="Preço médio" text="O preço médio pago ou recebido nas partes executadas. Pode ser melhor que o seu limite." placement="bottom" />
            </th>
            <th scope="col">Status<LtHelp v-if="!phone" title="Status" :text="statusHelp" placement="bottom" /></th>
            <th scope="col" class="is-num"><span class="lt-visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody v-if="isLoading">
          <tr v-for="row in skeletonRows" :key="row" class="orders-skeleton-row">
            <td v-for="cell in 8" :key="cell" :class="{ 'is-num': cell > 2 && cell !== 7 }"><span class="lt-skeleton orders-skeleton" :style="{ width: `${40 + ((row * 7 + cell * 13) % 40)}px` }"></span></td>
          </tr>
        </tbody>
        <TransitionGroup v-else tag="tbody" name="orders-row">
          <tr v-for="order in paged" :key="order.orderId" :class="['orders-row', `is-${order.side}`]">
            <td class="lt-num is-muted orders-cell-time"><RouterLink :to="`/ordens/${order.orderId}`" class="orders-link">{{ formatShortTime(order.createdAt) }}</RouterLink></td>
            <td :class="`orders-cell-side orders-side orders-side-${order.side}`"><span aria-hidden="true">{{ marks[order.side] }}</span> {{ sideLabels[order.side] }}</td>
            <td class="is-num orders-cell-price" data-label="Preço">{{ formatAmount(order.price, assetsOf(order.marketId).quote) }}</td>
            <td class="is-num orders-cell-qty" data-label="Qtd.">{{ formatAmount(order.quantity, assetsOf(order.marketId).base) }}</td>
            <td class="is-num orders-cell-fill" data-label="Executado">
              <span class="orders-fill">
                <span>{{ formatAmount(order.fillQuantity, assetsOf(order.marketId).base) }}</span>
                <span :class="['orders-fill-bar', { 'is-full': fillPercentage(order) === 100 }]" aria-hidden="true"><span :style="{ width: `${fillPercentage(order)}%` }"></span></span>
                <span class="orders-fill-pct">{{ fillPercentage(order) }}%</span>
              </span>
            </td>
            <td class="is-num is-muted orders-cell-avg" data-label="Preço médio">{{ order.fillPrice === undefined ? '–' : formatAmount(order.fillPrice, assetsOf(order.marketId).quote) }}</td>
            <td class="orders-cell-status"><span :class="['orders-status', { 'is-live': isLive(order.status) }]"><LtStatusBadge :status="order.status" /></span></td>
            <td class="is-num orders-cell-action">
              <LtButton v-if="canCancel(order)" variant="ghost" size="sm" class="orders-cancel" :aria-label="cancelLabel(order)" :loading="cancellingId === order.orderId" @click="cancel(order.orderId)">Cancelar ordem</LtButton>
            </td>
          </tr>
        </TransitionGroup>
      </table>
      <OrdersEmpty v-else-if="!error" :filtered="filter !== 'all'" @show-all="filter = 'all'" />
    </div>

    <nav v-if="!isLoading && orders.length > 0" class="orders-pager" aria-label="Páginas de ordens">
      <p class="orders-range lt-num" aria-live="polite">{{ rangeLabel }}</p>
      <LtButton variant="ghost" size="sm" aria-label="Página anterior" :disabled="!pageView.hasPrevious" @click="goTo(pageView.page - 1)"><span aria-hidden="true">‹</span> Anterior</LtButton>
      <LtButton variant="ghost" size="sm" aria-label="Próxima página" :disabled="!pageView.hasNext" @click="goTo(pageView.page + 1)">Próxima <span aria-hidden="true">›</span></LtButton>
    </nav>
  </section>
</template>
