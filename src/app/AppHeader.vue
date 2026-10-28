<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLogout, useSessionStore } from '@/contexts/identity';
import { useBalances } from '@/contexts/wallet';
import { defaultMarketId, marketOf } from '@/entities/market';
import { LtButton, decimalsOfAsset, formatDecimal, useMediaQuery } from '@/lastro';
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
/** What is free to trade, at a glance; the wallet has the rest. Wide screens only, so the header stays one row. */
const roomForBalances = useMediaQuery('(min-width: 1180px)');
const wallet = useBalances(() => (roomForBalances.value ? session.user?.accountId : undefined));
/** The quote currency first, as people read a portfolio: "USD 11.472,00 · BTC 0,04100000". */
const quote = marketOf(defaultMarketId)?.quote;
const balancesLabel = computed(() =>
  [...wallet.balances.value]
    .sort((a, b) => Number(b.assetId === quote) - Number(a.assetId === quote))
    .map((balance) => `${balance.assetId} ${formatDecimal(balance.available, decimalsOfAsset(balance.assetId))}`)
    .join(' · '),
);
const themeLabel = computed(() => (theme.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'));
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
    <RouterLink v-if="roomForBalances && balancesLabel" to="/carteira" class="app-balances lt-num"><span class="lt-visually-hidden">Disponível: </span>{{ balancesLabel }}</RouterLink>
    <span class="app-status"><span class="lt-live-dot" aria-hidden="true"></span> Ao vivo</span>
    <button type="button" class="app-theme" :aria-label="themeLabel" :title="themeLabel" @click="theme.toggle()">
      <span aria-hidden="true">{{ theme.theme === 'dark' ? '☀' : '☾' }}</span>
    </button>
    <span class="app-user">
      <span class="app-avatar" aria-hidden="true">{{ initials }}</span>
      <span class="app-user-name">{{ session.user?.name }}</span>
    </span>
    <LtButton variant="ghost" size="sm" :loading="pending" @click="logout">Sair</LtButton>
  </header>
</template>
