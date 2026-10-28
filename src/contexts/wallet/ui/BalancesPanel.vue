<script setup lang="ts">
import { LtAlert, LtBalanceTable, LtButton } from '@/lastro';
import { useBalances } from '../application/useBalances';

const props = defineProps<{ accountId?: string | undefined }>();
const emit = defineEmits<{ deposit: [] }>();
const { balances, isLoading, error } = useBalances(() => props.accountId);
const skeletonRows = 2;
</script>

<template>
  <section aria-labelledby="balances-title" class="wallet-balances">
    <h2 id="balances-title" class="lt-panel-title">Saldos</h2>

    <LtAlert v-if="error && balances.length === 0" tone="danger" title="Não foi possível carregar os saldos." detail="Tentamos de novo a cada poucos segundos." />

    <table v-if="isLoading" class="lt-table" aria-busy="true" aria-label="Carregando saldos">
      <thead>
        <tr>
          <th scope="col">Ativo</th>
          <th scope="col" class="is-num">Disponível</th>
          <th scope="col" class="is-num">Em ordens</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in skeletonRows" :key="row">
          <td><span class="lt-skeleton wallet-skeleton wallet-skeleton-short"></span></td>
          <td class="is-num"><span class="lt-skeleton wallet-skeleton"></span></td>
          <td class="is-num"><span class="lt-skeleton wallet-skeleton"></span></td>
        </tr>
      </tbody>
    </table>

    <LtBalanceTable v-else-if="!error || balances.length > 0" :balances="balances">
      <template #empty>
        <p class="wallet-empty-detail lt-muted">Deposite USD para comprar ou BTC para vender.</p>
        <LtButton variant="primary" @click="emit('deposit')">Depositar</LtButton>
      </template>
    </LtBalanceTable>
  </section>
</template>
