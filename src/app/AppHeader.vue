<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLogout, useSessionStore } from '@/contexts/identity';
import { defaultMarketId } from '@/entities/market';
import { LtButton } from '@/lastro';
import { useThemeStore } from './themeStore';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const theme = useThemeStore();
const { logout, pending } = useLogout({ onSignedOut: () => void router.push({ name: 'login' }) });

const links = [
  { to: `/mercado/${defaultMarketId}`, label: 'Mercado', section: 'market' },
  { to: '/carteira', label: 'Carteira', section: 'wallet' },
  { to: '/ordens', label: 'Ordens', section: 'orders' },
] as const;
const sectionOf: Record<string, string> = { market: 'market', wallet: 'wallet', orders: 'orders', order: 'orders' };
const activeIndex = computed(() => links.findIndex((link) => link.section === sectionOf[String(route.name)]));
const initials = computed(() =>
  (session.user?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(''),
);
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="app-brand" aria-label="Lastro, ir para o mercado">
      <span class="app-brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
      Lastro
    </RouterLink>
    <nav aria-label="Principal" class="app-nav" :style="{ '--active': activeIndex }">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" :class="{ 'is-active': links[activeIndex]?.to === link.to }" :aria-current="links[activeIndex]?.to === link.to ? 'page' : undefined">
        {{ link.label }}
      </RouterLink>
      <span v-if="activeIndex >= 0" class="app-nav-indicator" aria-hidden="true"></span>
    </nav>
    <span class="app-spacer"></span>
    <span class="app-status"><span class="lt-live-dot" aria-hidden="true"></span> Ao vivo</span>
    <button type="button" class="app-theme" :aria-label="theme.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'" @click="theme.toggle()">
      <span aria-hidden="true">{{ theme.theme === 'dark' ? '☀' : '☾' }}</span>
    </button>
    <span class="app-user">
      <span class="app-avatar" aria-hidden="true">{{ initials }}</span>
      <span class="app-user-name">{{ session.user?.name }}</span>
    </span>
    <LtButton variant="ghost" size="sm" :loading="pending" @click="logout">Sair</LtButton>
  </header>
</template>
