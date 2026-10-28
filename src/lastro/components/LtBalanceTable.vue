<script setup lang="ts">
import { decimalsOfAsset, formatDecimal } from '../format';

export interface LtBalanceRow {
  readonly assetId: string;
  readonly available: string;
  readonly reserved: string;
}

const props = defineProps<{ balances: readonly LtBalanceRow[]; emptyTitle?: string | undefined }>();
</script>

<template>
  <div v-if="props.balances.length === 0" class="lt-empty">
    <p class="lt-empty-title">{{ props.emptyTitle ?? 'Nenhum saldo ainda' }}</p>
    <slot name="empty"></slot>
  </div>
  <table v-else class="lt-table">
    <thead>
      <tr>
        <th scope="col">Ativo</th>
        <th scope="col" class="is-num">Disponível</th>
        <th scope="col" class="is-num">Em ordens</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="balance in props.balances" :key="balance.assetId">
        <th scope="row">{{ balance.assetId }}</th>
        <td class="is-num">{{ formatDecimal(balance.available, decimalsOfAsset(balance.assetId)) }}</td>
        <td class="is-num is-muted">{{ formatDecimal(balance.reserved, decimalsOfAsset(balance.assetId)) }}</td>
      </tr>
    </tbody>
  </table>
</template>
