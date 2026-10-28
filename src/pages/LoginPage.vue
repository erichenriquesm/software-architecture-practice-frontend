<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { LoginForm } from '@/contexts/identity';
import { safeReturnPath } from '@/shared/navigation/returnPath';

const route = useRoute();
const router = useRouter();
</script>

<template>
  <main class="page-centered">
    <LoginForm @signed-in="router.push(safeReturnPath(route.query.voltar))" />
  </main>
</template>
