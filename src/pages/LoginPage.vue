<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { AuthHero, LoginForm } from '@/contexts/identity';
import { isSessionEnded, safeReturnPath } from '@/shared/navigation/returnPath';

const route = useRoute();
const router = useRouter();
</script>

<template>
  <main class="auth-page">
    <AuthHero />
    <div class="auth-side">
      <LoginForm :session-ended="isSessionEnded(route.query)" @signed-in="router.push(safeReturnPath(route.query.voltar))" />
    </div>
  </main>
</template>
