<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '@/contexts/identity';
import { OrderDetail } from '@/contexts/orders';
import { balancesQueryKey } from '@/contexts/wallet';

const route = useRoute();
const orderId = computed(() => String(route.params.orderId));
const session = useSessionStore();
const queryClient = useQueryClient();
const refreshBalances = () => void queryClient.invalidateQueries({ queryKey: balancesQueryKey(session.user?.accountId ?? '') });
</script>

<template>
  <main class="page order-page">
    <OrderDetail :order-id="orderId" @cancelled="refreshBalances" />
  </main>
</template>
