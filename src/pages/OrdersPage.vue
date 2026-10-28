<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { computed } from 'vue';
import { useSessionStore } from '@/contexts/identity';
import { OrdersTable } from '@/contexts/orders';
import { balancesQueryKey } from '@/contexts/wallet';

const session = useSessionStore();
const accountId = computed(() => session.user?.accountId);
const queryClient = useQueryClient();
/** A cancelled order gives its reservation back: refresh the balances now instead of on the next poll. */
const refreshBalances = () => void queryClient.invalidateQueries({ queryKey: balancesQueryKey(accountId.value ?? '') });
</script>

<template>
  <main class="page">
    <h1 class="lt-page-title">Ordens</h1>
    <OrdersTable :account-id="accountId" @cancelled="refreshBalances" />
  </main>
</template>
