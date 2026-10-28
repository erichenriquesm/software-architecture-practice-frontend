<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSessionStore } from '@/contexts/identity';
import { BalancesPanel, EquityCard, MovementPanel } from '@/contexts/wallet';
import { LtSegmented, useMediaQuery } from '@/lastro';

type WalletTab = 'saldos' | 'movimentar';

const session = useSessionStore();
const accountId = computed(() => session.user?.accountId);
const movement = ref<InstanceType<typeof MovementPanel>>();

/** Phones show one panel at a time under a compact equity summary; desktops show everything side by side. */
const phone = useMediaQuery('(max-width: 760px)');
const tab = ref<WalletTab>('saldos');
const tabs = [
  { value: 'saldos', label: 'Saldos' },
  { value: 'movimentar', label: 'Movimentar' },
] as const;
const panelAttrs = (value: WalletTab) =>
  phone.value ? { id: `wallet-panel-${value}`, role: 'tabpanel', 'aria-labelledby': `wallet-tab-${value}` } : {};

const startDeposit = () => {
  tab.value = 'movimentar';
  void movement.value?.startDeposit();
};
</script>

<template>
  <main :class="['page', 'wallet-page', { 'is-phone': phone }]">
    <div class="wallet-heading">
      <h1 class="lt-page-title">Carteira</h1>
      <p class="lt-muted">O que está em ordens abertas fica reservado até a ordem sair do livro.</p>
    </div>
    <div class="wallet-layout">
      <EquityCard class="wallet-area-equity" :account-id="accountId" @deposit="startDeposit" />
      <LtSegmented v-if="phone" v-model="tab" class="wallet-area-tabs" :options="tabs" label="Seção da carteira" id-prefix="wallet" />
      <div v-show="!phone || tab === 'saldos'" class="wallet-area-balances" v-bind="panelAttrs('saldos')">
        <BalancesPanel :account-id="accountId" @deposit="startDeposit" />
      </div>
      <div v-show="!phone || tab === 'movimentar'" class="wallet-area-movement" v-bind="panelAttrs('movimentar')">
        <MovementPanel ref="movement" :account-id="accountId" />
      </div>
    </div>
  </main>
</template>
