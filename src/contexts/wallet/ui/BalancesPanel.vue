<script setup lang="ts">
import { computed } from 'vue';
import { LtButton } from '@/lastro';
import { inAssetOrder } from '../domain/portfolio';
import { useBalances } from '../application/useBalances';
import BalanceRow from './BalanceRow.vue';

const props = defineProps<{ accountId?: string | undefined }>();
const emit = defineEmits<{ deposit: [] }>();
const { balances, isLoading, error, refetch } = useBalances(() => props.accountId);
const skeletonRows = 2;
const ordered = computed(() => inAssetOrder(balances.value));
</script>

<template>
  <section aria-labelledby="balances-title" class="wallet-balances lt-panel lt-rise lt-rise-1">
    <div class="wallet-section-head">
      <h2 id="balances-title" class="lt-panel-title">Saldos</h2>
      <span class="wallet-legend-inline" aria-hidden="true"><span class="wallet-swatch is-free"></span>disponível <span class="wallet-swatch is-locked"></span>em ordens</span>
    </div>

    <div v-if="error && balances.length === 0" class="wallet-error" role="alert">
      <p class="lt-alert-title">Não foi possível carregar os saldos.</p>
      <p class="lt-muted">Tentamos de novo a cada poucos segundos.</p>
      <LtButton size="sm" @click="refetch">Tentar de novo</LtButton>
    </div>

    <div v-else-if="isLoading || balances.length > 0" class="wallet-assets-scroll">
      <table class="wallet-assets" :aria-busy="isLoading || undefined" :aria-label="isLoading ? 'Carregando saldos' : undefined" :aria-labelledby="isLoading ? undefined : 'balances-title'">
        <thead>
          <tr>
            <th scope="col">Ativo</th>
            <th scope="col" class="is-num">Disponível</th>
            <th scope="col" class="is-num">Em ordens</th>
            <th scope="col" class="is-num wallet-col-total">Total</th>
            <th scope="col" class="wallet-col-split">Distribuição</th>
          </tr>
        </thead>
        <tbody v-if="isLoading">
          <tr v-for="row in skeletonRows" :key="row">
            <th scope="row"><span class="wallet-asset"><span class="lt-skeleton wallet-glyph-skeleton"></span><span class="lt-skeleton wallet-skeleton wallet-skeleton-short"></span></span></th>
            <td class="is-num"><span class="lt-skeleton wallet-skeleton"></span></td>
            <td class="is-num"><span class="lt-skeleton wallet-skeleton"></span></td>
            <td class="is-num wallet-col-total"><span class="lt-skeleton wallet-skeleton"></span></td>
            <td class="wallet-col-split"><span class="lt-skeleton wallet-skeleton"></span></td>
          </tr>
        </tbody>
        <tbody v-else>
          <BalanceRow v-for="(holding, index) in ordered" :key="holding.assetId" :holding="holding" :index="index" />
        </tbody>
      </table>
    </div>

    <div v-else class="wallet-empty">
      <div class="wallet-empty-art" aria-hidden="true"><span class="wallet-glyph is-usd">USD</span><span class="wallet-glyph is-btc">BTC</span></div>
      <p class="lt-empty-title">Nenhum saldo ainda</p>
      <p class="wallet-empty-detail lt-muted">Deposite USD para comprar ou BTC para vender.</p>
      <LtButton variant="primary" @click="emit('deposit')">Depositar</LtButton>
    </div>
  </section>
</template>
