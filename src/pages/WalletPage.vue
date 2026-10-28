<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSessionStore } from '@/contexts/identity';
import { BalancesPanel, EquityCard, MovementPanel } from '@/contexts/wallet';

const session = useSessionStore();
const accountId = computed(() => session.user?.accountId);
const movement = ref<InstanceType<typeof MovementPanel>>();
</script>

<template>
  <main class="page">
    <div class="wallet-heading">
      <h1 class="lt-page-title">Carteira</h1>
      <p class="lt-muted">O que está em ordens abertas fica reservado até a ordem sair do livro.</p>
    </div>
    <div class="wallet-layout">
      <div class="wallet-main">
        <EquityCard :account-id="accountId" @deposit="movement?.startDeposit()" />
        <BalancesPanel :account-id="accountId" @deposit="movement?.startDeposit()" />
      </div>
      <MovementPanel ref="movement" :account-id="accountId" />
    </div>
  </main>
</template>
