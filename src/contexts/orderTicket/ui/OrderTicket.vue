<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import type { Market } from '@/entities/market';
import { LtAlert, LtAmountField, LtButton, LtSideToggle, formatDecimal } from '@/lastro';
import { useOrderTicket } from '../application/useOrderTicket';
import { shares } from '../domain/share';
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
const { form, side, step, draft, placed, total, reservation, availableForSide, balanceUse, canFillShares, activeShare, pending, blocked, secondsLeft, errorMessage, errorIsWarning, rejection } = ticket;
const submitButton = useTemplateRef<{ $el: HTMLElement }>('submit');
const priceBox = useTemplateRef<HTMLElement>('priceBox');
const announcement = ref('');

const verb = computed(() => (side.value === 'buy' ? 'Comprar' : 'Vender'));
const submitLabel = computed(() => `${verb.value} ${props.market.base}${blocked.value ? ` em ${secondsLeft.value} s` : ''}`);
const quoteDecimals = 2;
const best = computed(() => (side.value === 'buy' ? props.bestAsk : props.bestBid));
const bestLabel = computed(() => (best.value === undefined ? undefined : `${side.value === 'buy' ? 'Melhor venda' : 'Melhor compra'}: ${formatDecimal(best.value, quoteDecimals)}`));
const quantityHint = computed(() => {
  const asset = side.value === 'buy' ? props.market.quote : props.market.base;
  return availableForSide.value === undefined ? undefined : `Disponível: ${formatAsset(availableForSide.value, asset)}`;
});
const usageLabel = computed(() => {
  if (!balanceUse.value) return undefined;
  return balanceUse.value.exceeds ? 'Acima do disponível' : `Usa ${balanceUse.value.label}% do disponível`;
});
const draftReservation = computed(() => draft.value && reservationOf(props.market, draft.value.side, draft.value.price, draft.value.quantity));
const placedSummary = computed(() => {
  const order = placed.value?.order;
  if (!order) return undefined;
  return `${order.side === 'buy' ? 'Compra' : 'Venda'} de ${formatAsset(order.quantity, props.market.base)} a ${formatAsset(order.price, props.market.quote)}.`;
});

/** Restarts the highlight on the price field even when the same price is picked twice. */
const flashPrice = () => {
  const box = priceBox.value;
  if (!box) return;
  box.classList.remove('is-picked');
  void box.offsetWidth;
  box.classList.add('is-picked');
};

/** A price chosen outside the ticket (a level of the book, the best price) becomes the limit price. */
const setPrice = (price: string) => {
  ticket.applyPrice(price);
  announcement.value = `Preço limite ${formatDecimal(price, quoteDecimals)} ${props.market.quote}`;
  flashPrice();
};

defineExpose({ setPrice });

watch(step, async (current, previous) => {
  if (current !== 'editing' || previous !== 'confirming') return;
  await nextTick();
  submitButton.value?.$el.focus();
});
</script>

<template>
  <aside :class="['lt-panel', 'ticket', `is-${side}`, { 'has-message': errorMessage || placed }]" aria-labelledby="ticket-title">
    <header class="ticket-head">
      <p class="lt-eyebrow">Boleta · {{ props.market.marketId }}</p>
      <h2 id="ticket-title" class="lt-panel-title">Nova ordem limitada</h2>
    </header>

    <LtAlert v-if="errorMessage" :tone="errorIsWarning ? 'neutral' : 'danger'" :title="errorMessage.title" :detail="errorMessage.detail" />

    <form class="ticket-form" novalidate @submit.prevent="ticket.review">
      <LtSideToggle v-model="side" class="ticket-sides" :disabled="pending" />

      <div class="ticket-price-group">
        <div ref="priceBox" class="ticket-price">
          <LtAmountField id="ticket-price" v-model="form.values.price" label="Preço limite" :asset="props.market.quote" placeholder="0,00" :error="form.errors.price" @blur="form.touch('price')" />
        </div>
        <p v-if="bestLabel && best" class="ticket-best">
          <span class="lt-num">{{ bestLabel }}</span>
          <button type="button" class="ticket-link" aria-label="Usar melhor preço" @click="setPrice(best)">Usar</button>
        </p>
      </div>

      <div class="ticket-quantity-group">
        <LtAmountField id="ticket-quantity" v-model="form.values.quantity" label="Quantidade" :asset="props.market.base" placeholder="0,00000000" :hint="quantityHint" :error="form.errors.quantity" @blur="form.touch('quantity')" />
        <div class="ticket-shares" role="group" aria-label="Preencher com parte do disponível">
          <button
            v-for="share in shares"
            :key="share.value"
            type="button"
            :class="['ticket-share', { 'is-active': activeShare === share.value }]"
            :aria-pressed="activeShare === share.value"
            :disabled="!canFillShares || pending"
            :title="side === 'buy' && !canFillShares && availableForSide !== undefined ? 'Informe o preço limite primeiro' : undefined"
            @click="ticket.fillShare(share.value)"
          >
            {{ share.label }}
          </button>
        </div>
        <div v-if="balanceUse" :class="['ticket-usage', { 'is-over': balanceUse.exceeds }]">
          <span class="ticket-usage-track" aria-hidden="true"><span class="ticket-usage-fill" :style="{ width: `${balanceUse.percent}%` }"></span></span>
          <span class="ticket-usage-label">{{ usageLabel }}</span>
        </div>
      </div>

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
    <span class="lt-visually-hidden" role="status">{{ announcement }}</span>

    <LtAlert v-if="placed && rejection" tone="danger" :title="rejection.title">
      {{ rejection.detail }} <RouterLink :to="`/ordens/${placed.orderId}`">Ver ordem</RouterLink>
    </LtAlert>
    <Transition name="ticket-toast">
      <div v-if="placed && !rejection" :key="placed.orderId" role="status" class="ticket-placed">
        <span aria-hidden="true" class="ticket-placed-mark">✓</span>
        <span class="ticket-placed-text">
          <strong>Sua ordem entrou no livro.</strong>
          <span class="lt-muted">{{ placedSummary }}</span>
        </span>
        <RouterLink :to="`/ordens/${placed.orderId}`">Ver ordem</RouterLink>
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="ticket-dialog">
        <ConfirmOrderDialog
          v-if="step === 'confirming' && draft"
          :market="props.market"
          :order="draft"
          :reservation="draftReservation"
          :pending="pending"
          @confirm="ticket.confirm"
          @cancel="ticket.back"
        />
      </Transition>
    </Teleport>
  </aside>
</template>
