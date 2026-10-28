<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { sideLabels } from '@/entities/order';
import { decimalPlaces } from '@/entities/decimal';
import { LtAlert, LtButton, LtHelp, LtStatusBadge, formatDecimal, useMediaQuery } from '@/lastro';
import { canCancel, fillPercentage, filledValue, isLive, orderNotional, orderSteps, remainingQuantity, statusReasonText, withoutTrailingZeros } from '../domain/order';
import { useCancelOrder } from '../application/useCancelOrder';
import { useOrder } from '../application/useOrders';
import FillRing from './FillRing.vue';
import OrderSteps from './OrderSteps.vue';
import { assetsOf, formatAmount, formatFullTime } from './orderFormat';

const props = defineProps<{ orderId: string }>();
const emit = defineEmits<{ cancelled: [] }>();
const { order, isLoading, notFound, error, refetch } = useOrder(() => props.orderId);
const { cancel, cancellingId, errorMessage } = useCancelOrder({ onCancelled: () => emit('cancelled') });
/** Phones get a condensed detail (dot stepper, small ring, short receipt) so it fits without scrolling. */
const phone = useMediaQuery('(max-width: 760px)');

const compact = (value: string) => {
  const trimmed = withoutTrailingZeros(value);
  return formatDecimal(trimmed, decimalPlaces(trimmed));
};

const view = computed(() => {
  const current = order.value;
  if (!current) return undefined;
  const { base, quote } = assetsOf(current.marketId);
  const value = filledValue(current);
  const percentage = fillPercentage(current);
  return {
    title: `${sideLabels[current.side]} de ${compact(current.quantity)} ${base}`,
    price: `${formatAmount(current.price, quote)} ${quote}`,
    quantity: `${formatAmount(current.quantity, base)} ${base}`,
    notional: `${formatAmount(orderNotional(current), quote)} ${quote}`,
    executed: `${formatAmount(current.fillQuantity, base)} de ${formatAmount(current.quantity, base)} ${base}`,
    percentage,
    ringTone: current.status === 'filled' ? 'success' : isLive(current.status) ? 'active' : 'ended',
    averagePrice: current.fillPrice === undefined ? '–' : `${formatAmount(current.fillPrice, quote)} ${quote}`,
    valueLabel: current.side === 'buy' ? 'Pago' : 'Recebido',
    value: value === undefined ? '–' : `${formatAmount(value, quote)} ${quote}`,
    remaining: `${formatAmount(remainingQuantity(current), base)} ${base}`,
    createdAt: formatFullTime(current.createdAt),
    reason: statusReasonText(current.statusReason),
    steps: orderSteps(current),
    cancelLabel: current.status === 'partiallyFilled' ? 'Cancelar o restante' : 'Cancelar ordem',
    confirmTitle: current.status === 'partiallyFilled' ? 'Cancelar o que falta executar?' : 'Cancelar esta ordem?',
  } as const;
});

/** Cancelling asks once, in a small popover next to the button: Escape or a click outside keeps the order. */
const confirming = ref(false);
const cancelRoot = ref<HTMLElement>();
const closeConfirm = (returnFocus: boolean) => {
  confirming.value = false;
  if (returnFocus) void nextTick(() => document.getElementById('order-cancel-trigger')?.focus());
};
const onPointerDown = (event: PointerEvent) => {
  if (cancelRoot.value && event.target instanceof Node && !cancelRoot.value.contains(event.target)) closeConfirm(false);
};
watch(confirming, async (open) => {
  if (open) {
    document.addEventListener('pointerdown', onPointerDown);
    await nextTick();
    document.getElementById('order-cancel-keep')?.focus();
  } else {
    document.removeEventListener('pointerdown', onPointerDown);
  }
});
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown));
const confirmCancel = (orderId: string) => {
  confirming.value = false;
  cancel(orderId);
};
</script>

<template>
  <div :class="['order-detail', { 'is-phone': phone }]">
    <RouterLink to="/ordens" class="order-back"><span aria-hidden="true">←</span> Ordens</RouterLink>

    <div v-if="isLoading" class="order-loading" aria-busy="true" aria-label="Carregando ordem">
      <span class="lt-skeleton order-skeleton-title"></span>
      <div class="order-grid">
        <div class="order-card lt-panel order-skeleton-card">
          <span class="lt-skeleton order-skeleton-ring"></span>
          <div class="order-skeleton-lines"><span class="lt-skeleton order-skeleton-line"></span><span class="lt-skeleton order-skeleton-line is-short"></span><span class="lt-skeleton order-skeleton-line"></span></div>
        </div>
        <div class="order-receipt lt-panel order-skeleton-lines">
          <span v-for="line in 6" :key="line" class="lt-skeleton order-skeleton-line"></span>
        </div>
      </div>
    </div>

    <div v-else-if="notFound" class="order-empty lt-panel lt-rise">
      <div class="order-empty-art" aria-hidden="true"><span></span><span></span><span></span></div>
      <h1 class="lt-panel-title">Ordem não encontrada</h1>
      <p class="lt-muted">Ela não existe ou não é da sua conta. <RouterLink to="/ordens">Ver minhas ordens</RouterLink></p>
    </div>

    <div v-else-if="error && !order" class="order-error lt-rise">
      <LtAlert tone="danger" title="Não foi possível carregar a ordem.">Tentamos de novo em instantes. Se continuar, tente agora.</LtAlert>
      <LtButton size="sm" @click="refetch">Tentar de novo</LtButton>
    </div>

    <template v-else-if="order && view">
      <div class="order-header lt-rise">
        <div class="order-heading">
          <div class="order-title-row">
            <h1 :class="['lt-page-title', `order-title-${order.side}`]"><span class="order-title-mark" aria-hidden="true">{{ order.side === 'buy' ? '▲' : '▼' }}</span>{{ view.title }}</h1>
            <span :class="['orders-status', { 'is-live': isLive(order.status) }]"><LtStatusBadge :status="order.status" /></span>
          </div>
          <p class="lt-muted">
            {{ order.marketId }} · limite <span class="lt-num order-ink">{{ view.price }}</span>
          </p>
        </div>

        <div v-if="canCancel(order)" ref="cancelRoot" class="order-cancel" @keydown.esc="closeConfirm(true)">
          <LtButton
            id="order-cancel-trigger"
            variant="secondary"
            :size="phone ? 'sm' : 'md'"
            aria-haspopup="dialog"
            :aria-expanded="confirming"
            aria-controls="order-cancel-confirm"
            :loading="cancellingId === order.orderId"
            @click="confirming = !confirming"
          >
            {{ view.cancelLabel }}
          </LtButton>
          <Transition name="order-pop">
            <div v-if="confirming" id="order-cancel-confirm" role="dialog" aria-labelledby="order-cancel-title" aria-describedby="order-cancel-detail" class="order-popover">
              <p id="order-cancel-title" class="order-popover-title">{{ view.confirmTitle }}</p>
              <p id="order-cancel-detail" class="order-popover-detail">O que ainda não foi executado sai do livro e o saldo reservado para isso volta para a carteira. O que já foi executado não muda.</p>
              <div class="order-popover-actions">
                <LtButton id="order-cancel-keep" variant="ghost" size="sm" @click="closeConfirm(true)">Manter ordem</LtButton>
                <LtButton variant="primary" size="sm" @click="confirmCancel(order.orderId)">Sim, cancelar</LtButton>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <TransitionGroup name="orders-alert" tag="div" class="order-alerts">
        <LtAlert v-if="errorMessage" key="error" tone="danger" :title="errorMessage.title" :detail="errorMessage.detail" />
        <LtAlert v-if="order.status === 'cancelling'" key="cancelling" title="Cancelamento pedido." detail="A ordem sai do livro em instantes e o saldo reservado volta para a carteira." />
        <LtAlert v-if="view.reason" key="reason" tone="warning" title="Por que a ordem terminou assim" :detail="view.reason" />
      </TransitionGroup>

      <section aria-labelledby="order-steps-title" class="order-card lt-panel lt-rise lt-rise-1">
        <div class="order-card-head">
          <h2 id="order-steps-title" class="lt-eyebrow">Andamento</h2>
          <LtHelp v-if="!phone" title="Andamento" text="As etapas da sua ordem: recebida, saldo reservado, no livro e o resultado." placement="bottom" />
        </div>
        <OrderSteps :steps="view.steps" />
      </section>

      <div class="order-grid">
        <section aria-label="Execução" class="order-card order-execution lt-panel lt-rise lt-rise-2">
          <FillRing :percentage="view.percentage" :tone="view.ringTone" />
          <div class="order-execution-body">
            <div class="order-execution-head">
              <span class="lt-eyebrow">Executado<LtHelp title="Executado" text="Quanto da quantidade da ordem já foi negociado." /></span>
              <span class="lt-num order-execution-amount">{{ view.executed }} · {{ view.percentage }}%</span>
            </div>
            <dl class="order-facts">
              <div>
                <dt class="lt-eyebrow">Preço médio<LtHelp title="Preço médio" text="O preço médio pago ou recebido nas partes executadas. Pode ser melhor que o seu limite." /></dt>
                <dd class="lt-num">{{ view.averagePrice }}</dd>
              </div>
              <div><dt class="lt-eyebrow">{{ view.valueLabel }}</dt><dd class="lt-num">{{ view.value }}</dd></div>
              <div><dt class="lt-eyebrow">Restante<LtHelp title="Restante" text="O que ainda falta executar." /></dt><dd class="lt-num">{{ view.remaining }}</dd></div>
            </dl>
          </div>
        </section>

        <section aria-labelledby="order-receipt-title" class="order-receipt lt-panel lt-rise lt-rise-3">
          <h2 id="order-receipt-title" class="lt-eyebrow">Resumo da ordem</h2>
          <dl class="order-receipt-lines">
            <div class="is-market"><dt>Mercado</dt><dd>{{ order.marketId }}</dd></div>
            <div class="is-operation"><dt>Operação</dt><dd :class="`orders-side-${order.side}`"><span aria-hidden="true">{{ order.side === 'buy' ? '▲' : '▼' }}</span> {{ sideLabels[order.side] }} limitada</dd></div>
            <div><dt>Preço limite</dt><dd class="lt-num">{{ view.price }}</dd></div>
            <div><dt>Quantidade</dt><dd class="lt-num">{{ view.quantity }}</dd></div>
            <div class="is-total"><dt>Total no limite</dt><dd class="lt-num">{{ view.notional }}</dd></div>
            <div><dt>Criada em</dt><dd class="lt-num">{{ view.createdAt }}</dd></div>
            <div class="is-id"><dt>Ordem</dt><dd class="lt-num">{{ order.orderId }}</dd></div>
          </dl>
        </section>
      </div>
    </template>
  </div>
</template>
