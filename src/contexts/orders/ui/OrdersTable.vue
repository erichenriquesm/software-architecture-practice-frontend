<script setup lang="ts">
import { computed, ref } from 'vue';
import { sideLabels } from '@/entities/order';
import { LtAlert, LtButton, LtStatusBadge } from '@/lastro';
import { canCancel, orderFilterLabels, orderFilters } from '../domain/order';
import type { Order, OrderFilter } from '../domain/order';
import { useCancelOrder } from '../application/useCancelOrder';
import { useOrders } from '../application/useOrders';
import { assetsOf, formatAmount, formatShortTime } from './orderFormat';

const props = defineProps<{ accountId?: string | undefined }>();
const emit = defineEmits<{ cancelled: [] }>();
const filter = ref<OrderFilter>('all');
const { orders, isLoading, error } = useOrders(() => props.accountId, filter);
const { cancel, cancellingId, errorMessage } = useCancelOrder({ onCancelled: () => emit('cancelled') });

const marks = { buy: '▲', sell: '▼' } as const;
const skeletonRows = 4;
const showTable = computed(() => isLoading.value || orders.value.length > 0);
const cancelLabel = (order: Order) => `Cancelar ordem de ${sideLabels[order.side].toLowerCase()} criada em ${formatShortTime(order.createdAt)}`;
</script>

<template>
  <section aria-labelledby="orders-title" class="orders-panel lt-panel">
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
        </button>
      </div>
    </div>

    <div v-if="errorMessage || (error && orders.length === 0)" class="orders-alerts">
      <LtAlert v-if="errorMessage" tone="danger" :title="errorMessage.title" :detail="errorMessage.detail" />
      <LtAlert v-if="error && orders.length === 0" tone="danger" title="Não foi possível carregar as ordens." detail="Tentamos de novo em instantes. Recarregue a página se continuar." />
    </div>

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
            <td v-for="cell in 8" :key="cell"><span class="lt-skeleton orders-skeleton"></span></td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="order in orders" :key="order.orderId">
            <td class="lt-num is-muted"><RouterLink :to="`/ordens/${order.orderId}`" class="orders-link">{{ formatShortTime(order.createdAt) }}</RouterLink></td>
            <td :class="`orders-side-${order.side}`"><span aria-hidden="true">{{ marks[order.side] }}</span> {{ sideLabels[order.side] }}</td>
            <td class="is-num">{{ formatAmount(order.price, assetsOf(order.marketId).quote) }}</td>
            <td class="is-num">{{ formatAmount(order.quantity, assetsOf(order.marketId).base) }}</td>
            <td class="is-num">{{ formatAmount(order.fillQuantity, assetsOf(order.marketId).base) }}</td>
            <td class="is-num is-muted">{{ order.fillPrice === undefined ? '–' : formatAmount(order.fillPrice, assetsOf(order.marketId).quote) }}</td>
            <td><LtStatusBadge :status="order.status" /></td>
            <td class="is-num">
              <LtButton v-if="canCancel(order)" variant="ghost" size="sm" :aria-label="cancelLabel(order)" :loading="cancellingId === order.orderId" @click="cancel(order.orderId)">Cancelar ordem</LtButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!error" class="orders-empty">
      <template v-if="filter === 'all'">
        <p class="lt-panel-title">Nenhuma ordem ainda</p>
        <p class="lt-muted">Envie uma ordem pela boleta do <RouterLink to="/">mercado</RouterLink>.</p>
      </template>
      <template v-else>
        <p class="lt-panel-title">Nenhuma ordem com esse status</p>
        <p class="lt-muted">Troque o filtro ou envie uma ordem pela boleta do mercado.</p>
      </template>
    </div>
  </section>
</template>
