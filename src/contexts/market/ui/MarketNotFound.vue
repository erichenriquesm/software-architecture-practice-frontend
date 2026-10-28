<script setup lang="ts">
import { defaultMarketId } from '@/entities/market';

const props = defineProps<{ marketId: string }>();
</script>

<template>
  <div class="lt-empty market-not-found">
    <h1 class="lt-empty-title">Mercado não encontrado</h1>
    <p class="lt-muted market-empty-detail">O mercado {{ props.marketId }} não existe. Por enquanto só negociamos {{ defaultMarketId }}.</p>
    <RouterLink :to="`/mercado/${defaultMarketId}`">Ir para {{ defaultMarketId }}</RouterLink>
  </div>
</template>
