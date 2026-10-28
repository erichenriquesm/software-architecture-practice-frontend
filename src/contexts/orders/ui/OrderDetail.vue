<script setup lang="ts">
import { computed } from 'vue';
import { sideLabels } from '@/entities/order';
import { decimalPlaces } from '@/entities/decimal';
import { LtAlert, LtButton, LtStatusBadge, formatDecimal } from '@/lastro';
import { canCancel, fillPercentage, filledValue, remainingQuantity, statusReasonText, withoutTrailingZeros } from '../domain/order';
import { useCancelOrder } from '../application/useCancelOrder';
import { useOrder } from '../application/useOrders';
import { assetsOf, formatAmount, formatFullTime } from './orderFormat';

const props = defineProps<{ orderId: string }>();
const emit = defineEmits<{ cancelled: [] }>();
const { order, isLoading, notFound, error } = useOrder(() => props.orderId);
const { cancel, cancellingId, errorMessage } = useCancelOrder({ onCancelled: () => emit('cancelled') });

const compact = (value: string) => {
  const trimmed = withoutTrailingZeros(value);
  return formatDecimal(trimmed, decimalPlaces(trimmed));
};

const view = computed(() => {
  const current = order.value;
  if (!current) return undefined;
  const { base, quote } = assetsOf(current.marketId);
  const value = filledValue(current);
  return {
    title: `${sideLabels[current.side]} de ${compact(current.quantity)} ${base}`,
    price: `${formatAmount(current.price, quote)} ${quote}`,
    executed: `${formatAmount(current.fillQuantity, base)} de ${formatAmount(current.quantity, base)} ${base}`,
    percentage: fillPercentage(current),
    averagePrice: current.fillPrice === undefined ? '–' : formatAmount(current.fillPrice, quote),
    valueLabel: current.side === 'buy' ? 'Pago' : 'Recebido',
    value: value === undefined ? '–' : `${formatAmount(value, quote)} ${quote}`,
    remaining: `${formatAmount(remainingQuantity(current), base)} ${base}`,
    createdAt: formatFullTime(current.createdAt),
    reason: statusReasonText(current.statusReason),
    cancelLabel: current.status === 'partiallyFilled' ? 'Cancelar o restante' : 'Cancelar ordem',
  };
});
</script>

<template>
  <div class="order-detail">
    <RouterLink to="/ordens" class="order-back">← Ordens</RouterLink>

    <div v-if="isLoading" class="order-loading" aria-busy="true" aria-label="Carregando ordem">
      <span class="lt-skeleton order-skeleton-title"></span>
      <div class="order-execution lt-panel">
        <span class="lt-skeleton order-skeleton-line"></span>
        <span class="lt-skeleton order-skeleton-bar"></span>
      </div>
    </div>

    <div v-else-if="notFound" class="order-empty lt-panel">
      <h1 class="lt-panel-title">Ordem não encontrada</h1>
      <p class="lt-muted">Ela não existe ou não é da sua conta. <RouterLink to="/ordens">Ver minhas ordens</RouterLink></p>
    </div>

    <LtAlert v-else-if="error && !order" tone="danger" title="Não foi possível carregar a ordem." detail="Tentamos de novo em instantes. Recarregue a página se continuar." />

    <template v-else-if="order && view">
      <div class="order-header">
        <div class="order-heading">
          <div class="order-title-row">
            <h1 class="lt-page-title">{{ view.title }}</h1>
            <LtStatusBadge :status="order.status" />
          </div>
          <p class="lt-muted">
            {{ order.marketId }} · limite <span class="lt-num order-ink">{{ view.price }}</span> · ordem <span class="lt-num">{{ order.orderId }}</span>
          </p>
        </div>
        <LtButton v-if="canCancel(order)" variant="secondary" :loading="cancellingId === order.orderId" @click="cancel(order.orderId)">{{ view.cancelLabel }}</LtButton>
      </div>

      <LtAlert v-if="errorMessage" tone="danger" :title="errorMessage.title" :detail="errorMessage.detail" />
      <LtAlert v-if="order.status === 'cancelling'" title="Cancelamento pedido." detail="A ordem sai do livro em instantes e o saldo reservado volta para a carteira." />
      <LtAlert v-if="view.reason" tone="warning" title="Por que a ordem terminou assim" :detail="view.reason" />

      <section aria-label="Execução" class="order-execution lt-panel">
        <div class="order-execution-head">
          <span class="lt-muted">Executado</span>
          <span class="lt-num">{{ view.executed }} · {{ view.percentage }}%</span>
        </div>
        <div role="progressbar" aria-label="Execução da ordem" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="view.percentage" class="order-progress">
          <div class="order-progress-fill" :style="{ width: `${view.percentage}%` }"></div>
        </div>
        <dl class="order-facts">
          <div><dt class="lt-eyebrow">Preço médio</dt><dd class="lt-num">{{ view.averagePrice }}</dd></div>
          <div><dt class="lt-eyebrow">{{ view.valueLabel }}</dt><dd class="lt-num">{{ view.value }}</dd></div>
          <div><dt class="lt-eyebrow">Restante</dt><dd class="lt-num">{{ view.remaining }}</dd></div>
          <div><dt class="lt-eyebrow">Criada em</dt><dd class="lt-num">{{ view.createdAt }}</dd></div>
        </dl>
      </section>
    </template>
  </div>
</template>
