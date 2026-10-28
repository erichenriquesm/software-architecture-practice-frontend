<script setup lang="ts">
import { useRouter } from 'vue-router';
import { SignupForm } from '@/contexts/identity';

const router = useRouter();
</script>

<template>
  <main class="page-centered">
    <SignupForm @signed-in="router.push('/carteira')" />
  </main>
</template>
