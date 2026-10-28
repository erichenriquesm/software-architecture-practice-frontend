<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
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
const openLabel = (order: Order) => `, ver ordem de ${sideLabels[order.side].toLowerCase()}`;
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

/**
 * Cancelling from the list asks once, right where the button was: "Sim, cancelar" or "Manter". The question goes away
 * by itself after a few seconds, on Escape, when focus leaves it or on a click elsewhere, and the order stays.
 */
const confirmWindowMs = 5_000;
const confirmingId = ref<string>();
let confirmTimer: ReturnType<typeof setTimeout> | undefined;
const triggerId = (orderId: string) => `orders-cancel-${orderId}`;
const keepId = (orderId: string) => `orders-keep-${orderId}`;
const focusById = (id: string) => void nextTick(() => document.getElementById(id)?.focus());
const onPointerDown = (event: PointerEvent) => {
  const group = confirmingId.value ? document.getElementById(`orders-confirm-${confirmingId.value}`) : null;
  if (!(event.target instanceof Node) || !group?.contains(event.target)) stopConfirming(false);
};
const stopConfirming = (returnFocus: boolean) => {
  const orderId = confirmingId.value;
  if (!orderId) return;
  const group = document.getElementById(`orders-confirm-${orderId}`);
  const focusWasInside = group?.contains(document.activeElement) ?? false;
  confirmingId.value = undefined;
  clearTimeout(confirmTimer);
  document.removeEventListener('pointerdown', onPointerDown);
  if (returnFocus || focusWasInside) focusById(triggerId(orderId));
};
const askToCancel = (orderId: string) => {
  stopConfirming(false);
  confirmingId.value = orderId;
  confirmTimer = setTimeout(() => stopConfirming(false), confirmWindowMs);
  document.addEventListener('pointerdown', onPointerDown);
  focusById(keepId(orderId));
};
/** Tabbing out of the question keeps the order; focus moving between its two buttons does not. */
const onConfirmFocusOut = (event: FocusEvent) => {
  const next = event.relatedTarget;
  if (next instanceof Node && !(event.currentTarget as HTMLElement).contains(next)) stopConfirming(false);
};
const confirmCancel = (orderId: string) => {
  stopConfirming(false);
  cancel(orderId);
  focusById(triggerId(orderId));
};
watch(paged, (visible) => {
  if (confirmingId.value && !visible.some((order) => order.orderId === confirmingId.value && canCancel(order))) stopConfirming(false);
});
onBeforeUnmount(() => {
  clearTimeout(confirmTimer);
  document.removeEventListener('pointerdown', onPointerDown);
});
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
            <td class="lt-num is-muted orders-cell-time">
              <RouterLink :to="`/ordens/${order.orderId}`" class="orders-link">{{ formatShortTime(order.createdAt) }}<span class="lt-visually-hidden">{{ openLabel(order) }}</span></RouterLink>
            </td>
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
              <span v-if="canCancel(order)" class="orders-actions" @keydown.esc="stopConfirming(true)">
                <LtButton
                  :id="triggerId(order.orderId)"
                  variant="ghost"
                  size="sm"
                  :class="['orders-cancel', { 'is-asking': confirmingId === order.orderId }]"
                  :aria-label="cancelLabel(order)"
                  :aria-expanded="confirmingId === order.orderId"
                  :aria-controls="confirmingId === order.orderId ? `orders-confirm-${order.orderId}` : undefined"
                  :loading="cancellingId === order.orderId"
                  @click="askToCancel(order.orderId)"
                >
                  Cancelar ordem
                </LtButton>
                <Transition name="orders-confirm">
                  <span v-if="confirmingId === order.orderId" :id="`orders-confirm-${order.orderId}`" role="group" :aria-label="`${cancelLabel(order)}?`" class="orders-confirm" @focusout="onConfirmFocusOut">
                    <LtButton :id="keepId(order.orderId)" variant="ghost" size="sm" @click="stopConfirming(true)">Manter</LtButton>
                    <LtButton variant="primary" size="sm" @click="confirmCancel(order.orderId)">Sim, cancelar</LtButton>
                  </span>
                </Transition>
              </span>
              <span class="orders-chevron" aria-hidden="true">›</span>
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
