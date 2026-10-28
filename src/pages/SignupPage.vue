<script setup lang="ts">
import { useRouter } from 'vue-router';
import { AuthHero, SignupForm } from '@/contexts/identity';

const router = useRouter();
</script>

<template>
  <main class="auth-page">
    <AuthHero />
    <div class="auth-side">
      <SignupForm @signed-in="router.push('/carteira')" />
    </div>
  </main>
</template>
