<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useLogout, useSessionStore } from '@/contexts/identity';
import { defaultMarketId } from '@/entities/market';
import { LtButton } from '@/lastro';
import { useThemeStore } from './themeStore';

const router = useRouter();
const session = useSessionStore();
const theme = useThemeStore();
const { logout, pending } = useLogout({ onSignedOut: () => void router.push({ name: 'login' }) });
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="app-brand">Lastro</RouterLink>
    <nav aria-label="Principal" class="app-nav">
      <RouterLink :to="`/mercado/${defaultMarketId}`" active-class="is-active">Mercado</RouterLink>
      <RouterLink to="/carteira" active-class="is-active">Carteira</RouterLink>
      <RouterLink to="/ordens" active-class="is-active">Ordens</RouterLink>
    </nav>
    <span class="app-spacer"></span>
    <button type="button" class="app-theme" :aria-label="theme.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'" @click="theme.toggle()">
      {{ theme.theme === 'dark' ? 'Tema claro' : 'Tema escuro' }}
    </button>
    <span class="lt-muted app-user">{{ session.user?.name }}</span>
    <LtButton variant="ghost" size="sm" :loading="pending" @click="logout">Sair</LtButton>
  </header>
</template>
