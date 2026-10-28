<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { assets } from '@/entities/market';
import { LtAlert, LtAmountField, LtButton, decimalsOfAsset, formatDecimal } from '@/lastro';
import { movementKinds } from '../domain/movement';
import type { MovementKind } from '../domain/movement';
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
  <aside aria-labelledby="movement-title" class="wallet-movement lt-panel">
    <h2 id="movement-title" class="lt-panel-title">Movimentar</h2>

    <div role="tablist" aria-label="Tipo de movimentação" class="wallet-tabs" @keydown.right.prevent="moveFocus(1)" @keydown.left.prevent="moveFocus(-1)">
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
      <LtAlert v-if="errorMessage" tone="danger" :title="errorMessage.title" :detail="errorMessage.detail" />
      <LtAlert v-if="doneMessage" :title="doneMessage.title" :detail="doneMessage.detail" />

      <div class="wallet-select-field">
        <label class="lt-field-label" for="movement-asset">Ativo</label>
        <select id="movement-asset" v-model="form.values.assetId" class="wallet-select" @change="form.touch('assetId')">
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

      <LtButton type="submit" variant="primary" class="wallet-submit" :loading="pending">{{ submitLabel }}</LtButton>
      <p class="wallet-note lt-muted">{{ note }}</p>
    </form>
  </aside>
</template>
