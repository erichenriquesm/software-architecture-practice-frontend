<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue';
import type { Market } from '@/entities/market';
import { LtAlert, LtAmountField, LtButton, LtSideToggle, formatDecimal } from '@/lastro';
import { useOrderTicket } from '../application/useOrderTicket';
import { formatAsset, reservationOf } from '../domain/ticket';
import ConfirmOrderDialog from './ConfirmOrderDialog.vue';

const props = defineProps<{
  market: Market;
  available?: Readonly<Partial<Record<string, string>>> | undefined;
  bestBid?: string | undefined;
  bestAsk?: string | undefined;
}>();
const emit = defineEmits<{ placed: [orderId: string] }>();

const ticket = useOrderTicket({ market: props.market, available: () => props.available, onPlaced: (orderId) => emit('placed', orderId) });
const { form, side, step, draft, placed, total, reservation, availableForSide, pending, blocked, secondsLeft, errorMessage, errorIsWarning, rejection } = ticket;
const submitButton = useTemplateRef<{ $el: HTMLElement }>('submit');

const verb = computed(() => (side.value === 'buy' ? 'Comprar' : 'Vender'));
const submitLabel = computed(() => `${verb.value} ${props.market.base}${blocked.value ? ` em ${secondsLeft.value} s` : ''}`);
const quoteDecimals = 2;
const priceHint = computed(() => {
  const best = side.value === 'buy' ? props.bestAsk : props.bestBid;
  if (best === undefined) return undefined;
  return `${side.value === 'buy' ? 'Melhor venda' : 'Melhor compra'}: ${formatDecimal(best, quoteDecimals)}`;
});
const quantityHint = computed(() => {
  const asset = side.value === 'buy' ? props.market.quote : props.market.base;
  return availableForSide.value === undefined ? undefined : `Disponível: ${formatAsset(availableForSide.value, asset)}`;
});
const draftReservation = computed(() => draft.value && reservationOf(props.market, draft.value.side, draft.value.price, draft.value.quantity));
const placedSummary = computed(() => {
  const order = placed.value?.order;
  if (!order) return undefined;
  return `${order.side === 'buy' ? 'Compra' : 'Venda'} de ${formatAsset(order.quantity, props.market.base)} a ${formatAsset(order.price, props.market.quote)}.`;
});

watch(step, async (current, previous) => {
  if (current !== 'editing' || previous !== 'confirming') return;
  await nextTick();
  submitButton.value?.$el.focus();
});
</script>

<template>
  <aside class="lt-panel ticket" aria-labelledby="ticket-title">
    <h2 id="ticket-title" class="lt-panel-title">Nova ordem limitada</h2>

    <LtAlert v-if="errorMessage" :tone="errorIsWarning ? 'neutral' : 'danger'" :title="errorMessage.title" :detail="errorMessage.detail" />

    <form class="ticket-form" novalidate @submit.prevent="ticket.review">
      <LtSideToggle v-model="side" class="ticket-sides" :disabled="pending" />
      <LtAmountField id="ticket-price" v-model="form.values.price" label="Preço limite" :asset="props.market.quote" placeholder="0,00" :hint="priceHint" :error="form.errors.price" @blur="form.touch('price')" />
      <LtAmountField id="ticket-quantity" v-model="form.values.quantity" label="Quantidade" :asset="props.market.base" placeholder="0,00000000" :hint="quantityHint" :error="form.errors.quantity" @blur="form.touch('quantity')" />

      <dl class="ticket-totals">
        <div>
          <dt>Total</dt>
          <dd class="lt-num">{{ total === undefined ? '–' : formatDecimal(total, quoteDecimals) }} <span class="lt-unit">{{ props.market.quote }}</span></dd>
        </div>
        <div>
          <dt>Fica reservado</dt>
          <dd class="lt-num">{{ reservation ? formatAsset(reservation.amount, reservation.assetId) : '–' }}</dd>
        </div>
      </dl>

      <LtButton ref="submit" type="submit" :variant="side" class="ticket-submit" :loading="pending" :disabled="blocked">{{ submitLabel }}</LtButton>
    </form>
    <p class="lt-muted ticket-note">Sua ordem fica no livro até encontrar uma contraparte. Você revisa o resumo antes de enviar.</p>

    <LtAlert v-if="placed && rejection" tone="danger" :title="rejection.title">
      {{ rejection.detail }} <RouterLink :to="`/ordens/${placed.orderId}`">Ver ordem</RouterLink>
    </LtAlert>
    <div v-else-if="placed" role="status" class="ticket-placed">
      <span aria-hidden="true" class="ticket-placed-mark">✓</span>
      <span class="ticket-placed-text">
        <strong>Sua ordem entrou no livro.</strong>
        <span class="lt-muted">{{ placedSummary }}</span>
      </span>
      <RouterLink :to="`/ordens/${placed.orderId}`">Ver ordem</RouterLink>
    </div>

    <ConfirmOrderDialog
      v-if="step === 'confirming' && draft"
      :market="props.market"
      :order="draft"
      :reservation="draftReservation"
      :pending="pending"
      @confirm="ticket.confirm"
      @cancel="ticket.back"
    />
  </aside>
</template>
