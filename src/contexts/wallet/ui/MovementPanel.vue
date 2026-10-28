<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { assets } from '@/entities/market';
import { decimalPlaces, normalizeTypedDecimal } from '@/entities/decimal';
import { LtAlert, LtAmountField, LtButton, decimalsOfAsset, formatDecimal } from '@/lastro';
import { movementKinds } from '../domain/movement';
import type { MovementKind } from '../domain/movement';
import { changeDirection, isSameAmount, quickAmounts } from '../domain/portfolio';
import type { QuickAmount } from '../domain/portfolio';
import { useMovement } from '../application/useMovement';

const props = defineProps<{ accountId?: string | undefined }>();
const { kind, selectKind, form, submit, pending, done, available, errorMessage } = useMovement(() => props.accountId);

const tabLabels: Readonly<Record<MovementKind, string>> = { deposit: 'Depositar', withdraw: 'Sacar' };
const tabRefs = ref<HTMLButtonElement[]>([]);
const decimals = computed(() => decimalsOfAsset(form.values.assetId));
const submitLabel = computed(() => `${tabLabels[kind.value]} ${form.values.assetId}`);
const hint = computed(() =>
  kind.value === 'deposit' ? 'Depósito simulado: o valor entra em instantes.' : `Disponível para saque: ${formatDecimal(available.value, decimals.value)} ${form.values.assetId}`,
);
const note = computed(() =>
  kind.value === 'deposit' ? 'Este ambiente não move dinheiro de verdade.' : 'Valores reservados em ordens abertas não podem ser sacados. Cancele a ordem para liberar.',
);
const doneMessage = computed(() => {
  if (!done.value) return undefined;
  const amount = `${formatDecimal(done.value.quantity, decimalsOfAsset(done.value.assetId))} ${done.value.assetId}`;
  if (done.value.kind === 'deposit') return { title: 'Depósito registrado.', detail: `${amount} entram no saldo em instantes.` };
  return { title: 'Saque registrado.', detail: `${amount} saem do saldo em instantes.` };
});

/** The balance lights up when it changes for the same asset, not when the user switches assets. */
const flashClass = ref('');
const flashKey = ref(0);
watch(
  () => [form.values.assetId, available.value] as const,
  ([asset, next], [previousAsset, previous]) => {
    const direction = asset === previousAsset ? changeDirection(previous, next) : undefined;
    if (!direction) return;
    flashClass.value = `lt-flash-${direction}`;
    flashKey.value += 1;
  },
);

const chips = computed(() => quickAmounts(kind.value, form.values.assetId, available.value));
const typed = computed(() => normalizeTypedDecimal(form.values.quantity));
const chipLabel = (chip: QuickAmount) => (chip.isMax ? 'Máx' : formatDecimal(chip.value, decimalPlaces(chip.value)));
const chipName = (chip: QuickAmount) =>
  chip.isMax ? `Sacar tudo: ${formatDecimal(chip.value, decimals.value)} ${form.values.assetId}` : `${formatDecimal(chip.value, decimalPlaces(chip.value))} ${form.values.assetId}`;
const pick = (chip: QuickAmount) => {
  form.values.quantity = formatDecimal(chip.value, decimals.value);
  form.touch('quantity');
};

const moveFocus = async (step: number) => {
  const index = (movementKinds.indexOf(kind.value) + step + movementKinds.length) % movementKinds.length;
  const next = movementKinds[index];
  if (!next) return;
  selectKind(next);
  await nextTick();
  tabRefs.value[index]?.focus();
};

const startDeposit = async () => {
  selectKind('deposit');
  await nextTick();
  document.getElementById('movement-quantity')?.focus();
};

defineExpose({ startDeposit });
</script>

<template>
  <aside aria-labelledby="movement-title" class="wallet-movement lt-panel lt-rise lt-rise-2">
    <div class="wallet-section-head">
      <h2 id="movement-title" class="lt-panel-title">Movimentar</h2>
      <span class="wallet-available">
        <span class="lt-muted">disponível</span>
        <span :key="flashKey" :class="['wallet-flash', 'lt-num', flashClass]">{{ formatDecimal(available, decimals) }} {{ form.values.assetId }}</span>
      </span>
    </div>

    <div
      role="tablist"
      aria-label="Tipo de movimentação"
      class="wallet-tabs"
      :style="{ '--tab-index': movementKinds.indexOf(kind) }"
      @keydown.right.prevent="moveFocus(1)"
      @keydown.left.prevent="moveFocus(-1)"
    >
      <button
        v-for="option in movementKinds"
        :id="`movement-tab-${option}`"
        :key="option"
        ref="tabRefs"
        type="button"
        role="tab"
        :aria-selected="kind === option"
        aria-controls="movement-form"
        :tabindex="kind === option ? 0 : -1"
        :class="['wallet-tab', { 'is-active': kind === option }]"
        @click="selectKind(option)"
      >
        {{ tabLabels[option] }}
      </button>
    </div>

    <form id="movement-form" role="tabpanel" :aria-labelledby="`movement-tab-${kind}`" class="wallet-movement-form" novalidate @submit.prevent="submit">
      <Transition name="wallet-toast">
        <LtAlert v-if="errorMessage" :key="errorMessage.title" class="wallet-alert" tone="danger" :title="errorMessage.title" :detail="errorMessage.detail" />
      </Transition>

      <div class="wallet-select-field">
        <label class="wallet-select-label" for="movement-asset">Ativo</label>
        <span :class="['wallet-glyph', 'wallet-glyph-sm', `is-${form.values.assetId.toLowerCase()}`]" aria-hidden="true">{{ form.values.assetId }}</span>
        <select id="movement-asset" v-model="form.values.assetId" class="lt-select wallet-select" @change="form.touch('assetId')">
          <option v-for="asset in assets" :key="asset" :value="asset">{{ asset }}</option>
        </select>
      </div>

      <LtAmountField
        id="movement-quantity"
        v-model="form.values.quantity"
        label="Quantidade"
        :asset="form.values.assetId"
        :placeholder="formatDecimal('0', decimals)"
        :hint="hint"
        :error="form.errors.quantity"
        @blur="form.touch('quantity')"
      />

      <div v-if="chips.length > 0" role="group" aria-label="Valores rápidos" class="wallet-chips">
        <button
          v-for="chip in chips"
          :key="`${kind}-${form.values.assetId}-${chip.value}-${chip.isMax}`"
          type="button"
          :aria-label="chipName(chip)"
          :aria-pressed="isSameAmount(typed, chip.value)"
          :class="['wallet-chip', { 'is-max': chip.isMax, 'is-active': isSameAmount(typed, chip.value) }]"
          @click="pick(chip)"
        >
          {{ chipLabel(chip) }}
        </button>
      </div>

      <LtButton type="submit" variant="primary" class="wallet-submit" :loading="pending">{{ submitLabel }}</LtButton>

      <Transition name="wallet-toast">
        <div v-if="doneMessage" :key="`${doneMessage.title}${doneMessage.detail}`" role="status" class="wallet-toast">
          <span class="wallet-toast-icon" aria-hidden="true"></span>
          <span class="wallet-toast-text">
            <strong>{{ doneMessage.title }}</strong>
            <span>{{ doneMessage.detail }}</span>
          </span>
        </div>
      </Transition>

      <p class="wallet-note lt-muted">{{ note }}</p>
    </form>
  </aside>
</template>
