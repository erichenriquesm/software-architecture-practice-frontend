<script setup lang="ts">
import { computed, ref } from 'vue';
import { sideLabels } from '@/entities/order';
import { LtAlert, LtButton, LtStatusBadge } from '@/lastro';
import { canCancel, fillPercentage, isLive, orderFilterLabels, orderFilters } from '../domain/order';
import type { Order, OrderFilter } from '../domain/order';
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
const skeletonRows = 4;
const showTable = computed(() => isLoading.value || orders.value.length > 0);
const cancelLabel = (order: Order) => `Cancelar ordem de ${sideLabels[order.side].toLowerCase()} criada em ${formatShortTime(order.createdAt)}`;
const countLabel = (count: number) => (count === 1 ? '1 ordem' : `${count} ordens`);
</script>

<template>
  <section aria-labelledby="orders-title" class="orders-panel lt-panel lt-rise">
    <div class="orders-toolbar">
      <h2 id="orders-title" class="lt-panel-title">Minhas ordens</h2>
      <div role="group" aria-label="Filtrar por status" class="orders-filters">
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

    <div v-if="showTable" class="orders-scroll">
      <table class="orders-table" :aria-busy="isLoading || undefined">
        <thead>
          <tr>
            <th scope="col">Criada em</th>
            <th scope="col">Operação</th>
            <th scope="col" class="is-num">Preço limite</th>
            <th scope="col" class="is-num">Quantidade</th>
            <th scope="col" class="is-num">Executado</th>
            <th scope="col" class="is-num">Preço médio</th>
            <th scope="col">Status</th>
            <th scope="col" class="is-num"><span class="lt-visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody v-if="isLoading">
          <tr v-for="row in skeletonRows" :key="row">
            <td v-for="cell in 8" :key="cell" :class="{ 'is-num': cell > 2 && cell !== 7 }"><span class="lt-skeleton orders-skeleton" :style="{ width: `${40 + ((row * 7 + cell * 13) % 40)}px` }"></span></td>
          </tr>
        </tbody>
        <TransitionGroup v-else tag="tbody" name="orders-row">
          <tr v-for="order in orders" :key="order.orderId" :class="['orders-row', `is-${order.side}`]">
            <td class="lt-num is-muted"><RouterLink :to="`/ordens/${order.orderId}`" class="orders-link">{{ formatShortTime(order.createdAt) }}</RouterLink></td>
            <td :class="`orders-side orders-side-${order.side}`"><span aria-hidden="true">{{ marks[order.side] }}</span> {{ sideLabels[order.side] }}</td>
            <td class="is-num" data-label="Preço limite">{{ formatAmount(order.price, assetsOf(order.marketId).quote) }}</td>
            <td class="is-num" data-label="Quantidade">{{ formatAmount(order.quantity, assetsOf(order.marketId).base) }}</td>
            <td class="is-num" data-label="Executado">
              <span class="orders-fill">
                <span>{{ formatAmount(order.fillQuantity, assetsOf(order.marketId).base) }}</span>
                <span :class="['orders-fill-bar', { 'is-full': fillPercentage(order) === 100 }]" aria-hidden="true"><span :style="{ width: `${fillPercentage(order)}%` }"></span></span>
                <span class="orders-fill-pct">{{ fillPercentage(order) }}%</span>
              </span>
            </td>
            <td class="is-num is-muted" data-label="Preço médio">{{ order.fillPrice === undefined ? '–' : formatAmount(order.fillPrice, assetsOf(order.marketId).quote) }}</td>
            <td><span :class="['orders-status', { 'is-live': isLive(order.status) }]"><LtStatusBadge :status="order.status" /></span></td>
            <td class="is-num">
              <LtButton v-if="canCancel(order)" variant="ghost" size="sm" class="orders-cancel" :aria-label="cancelLabel(order)" :loading="cancellingId === order.orderId" @click="cancel(order.orderId)">Cancelar ordem</LtButton>
            </td>
          </tr>
        </TransitionGroup>
      </table>
    </div>

    <OrdersEmpty v-else-if="!error" :filtered="filter !== 'all'" @show-all="filter = 'all'" />
  </section>
</template>
