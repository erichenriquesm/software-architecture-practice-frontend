<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue';
import type { Market } from '@/entities/market';
import { LtButton } from '@/lastro';
import { formatAsset } from '../domain/ticket';
import type { Reservation, TicketOrder } from '../domain/ticket';

const props = defineProps<{ market: Market; order: TicketOrder; reservation?: Reservation | undefined; pending?: boolean | undefined }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const dialog = useTemplateRef<HTMLElement>('dialog');

const buying = computed(() => props.order.side === 'buy');
const consequence = computed(() =>
  buying.value
    ? 'Se houver venda abaixo do seu limite, você paga o preço da ordem que já está no livro e a diferença volta para o seu saldo disponível. Você pode cancelar o que não for executado.'
    : 'Se houver compra acima do seu limite, você recebe o preço da ordem que já está no livro. Você pode cancelar o que não for executado.',
);

const focusables = () => [...(dialog.value?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])];

const keepFocusInside = (event: KeyboardEvent) => {
  const elements = focusables();
  const first = elements[0];
  const last = elements.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const cancel = () => {
  if (props.pending) return;
  emit('cancel');
};

onMounted(() => dialog.value?.focus());
</script>

<template>
  <div class="ticket-overlay" @click.self="cancel">
    <section
      ref="dialog"
      :class="['lt-panel', 'ticket-dialog', buying ? 'is-buy' : 'is-sell']"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      tabindex="-1"
      @keydown.esc.prevent="cancel"
      @keydown.tab="keepFocusInside"
    >
      <div class="ticket-dialog-heading">
        <p class="lt-eyebrow">Revisão · {{ props.market.marketId }}</p>
        <h2 id="confirm-title" class="ticket-dialog-title">{{ buying ? 'Confirmar compra' : 'Confirmar venda' }}</h2>
        <p id="confirm-desc" class="lt-muted ticket-dialog-desc">Revise antes de enviar. A ordem entra no livro e pode ser executada na hora.</p>
      </div>

      <div class="ticket-receipt">
        <dl class="ticket-summary">
          <dt>Mercado</dt>
          <dd class="lt-num">{{ props.market.marketId }}</dd>
          <dt>Operação</dt>
          <dd :class="buying ? 'ticket-side-buy' : 'ticket-side-sell'"><span aria-hidden="true">{{ buying ? '▲' : '▼' }}</span> {{ buying ? 'Compra limitada' : 'Venda limitada' }}</dd>
          <dt>Preço limite</dt>
          <dd class="lt-num">{{ formatAsset(props.order.price, props.market.quote) }}</dd>
          <dt>Quantidade</dt>
          <dd class="lt-num">{{ formatAsset(props.order.quantity, props.market.base) }}</dd>
          <dt class="ticket-summary-total">Fica reservado</dt>
          <dd class="lt-num ticket-summary-total">{{ props.reservation ? formatAsset(props.reservation.amount, props.reservation.assetId) : '–' }}</dd>
        </dl>
      </div>

      <p class="lt-muted ticket-note">{{ consequence }}</p>

      <div class="ticket-dialog-actions">
        <LtButton variant="secondary" :disabled="props.pending" @click="cancel">Voltar</LtButton>
        <LtButton :variant="props.order.side" class="ticket-confirm" :loading="props.pending" @click="emit('confirm')">{{ buying ? 'Comprar' : 'Vender' }} {{ props.market.base }}</LtButton>
      </div>
    </section>
  </div>
</template>
