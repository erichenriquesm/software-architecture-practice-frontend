<script setup lang="ts">
import { computed } from 'vue';
import { LtButton, LtHelp, formatDecimal, useFlash } from '@/lastro';
import { estimateEquity } from '../domain/portfolio';
import { useBalances } from '../application/useBalances';
import { useReferencePrice } from '../application/useReferencePrice';
import { useCountUp } from './useCountUp';

const props = defineProps<{ accountId?: string | undefined }>();
const emit = defineEmits<{ deposit: [] }>();
const { balances, isLoading, error, refetch } = useBalances(() => props.accountId);
const { price } = useReferencePrice();

const equity = computed(() => (balances.value.length === 0 && isLoading.value ? undefined : estimateEquity(balances.value, price.value)));
const shownTotal = useCountUp(() => equity.value?.totalUsd, 2);
const { flashClass, flashKey } = useFlash(() => equity.value?.totalUsd);
/** Whole part large, cents small, the way a banking app shows a balance. */
const parts = computed(() => {
  const [whole = '', cents = ''] = formatDecimal(shownTotal.value ?? '0', 2).split(',');
  return { whole, cents };
});
const empty = computed(() => equity.value !== undefined && equity.value.totalUsd === '0.00');
</script>

<template>
  <section class="wallet-equity lt-panel lt-rise" aria-labelledby="equity-title" :aria-busy="isLoading || undefined">
    <div class="wallet-equity-glow" aria-hidden="true"></div>
    <div class="wallet-equity-head">
      <h2 id="equity-title" class="lt-eyebrow">Patrimônio estimado</h2>
      <LtHelp
        title="Patrimônio estimado"
        text="Seu USD mais seus BTC convertidos pelo último preço negociado. É uma estimativa: o valor real depende do preço na hora de vender."
        placement="bottom"
      />
      <span class="wallet-equity-tag">estimado</span>
    </div>

    <template v-if="isLoading && !equity">
      <span class="lt-skeleton wallet-equity-skeleton-total"></span>
      <span class="lt-skeleton wallet-equity-skeleton-bar"></span>
      <span class="lt-skeleton wallet-equity-skeleton-legend"></span>
    </template>

    <div v-else-if="error && balances.length === 0" class="wallet-equity-error" role="alert">
      <p class="lt-alert-title">Não foi possível carregar a carteira.</p>
      <p class="lt-muted">Verifique sua conexão. Tentamos de novo sozinhos a cada poucos segundos.</p>
      <LtButton size="sm" @click="refetch">Tentar de novo</LtButton>
    </div>

    <template v-else-if="equity">
      <p class="wallet-equity-total">
        <span class="lt-visually-hidden">{{ formatDecimal(equity.totalUsd, 2) }} USD</span>
        <span :key="flashKey" :class="['wallet-equity-amount', flashClass]" aria-hidden="true">
          <span class="wallet-equity-whole">{{ parts.whole }}</span><span class="wallet-equity-cents">,{{ parts.cents }}</span>
        </span>
        <span class="wallet-equity-unit" aria-hidden="true">USD</span>
      </p>
      <p class="wallet-equity-sub lt-muted">
        <template v-if="equity.priced && equity.totalBtc !== undefined">
          ≈ <span class="lt-num">{{ formatDecimal(equity.totalBtc, 8) }}</span> BTC · BTC a <span class="lt-num">{{ formatDecimal(price ?? '0', 2) }}</span> USD, último negócio
        </template>
        <template v-else>Sem negociações ainda: o BTC fica fora da estimativa até haver um preço.</template>
      </p>

      <div v-if="!empty" class="wallet-allocation">
        <div class="wallet-allocation-bar" role="img" :aria-label="`Distribuição: USD ${formatDecimal(equity.allocation.usd, 1)}%, BTC ${formatDecimal(equity.allocation.btc, 1)}%`">
          <span class="wallet-allocation-usd" :style="{ width: `${equity.allocation.usd}%` }"></span>
          <span class="wallet-allocation-btc" :style="{ width: `${equity.allocation.btc}%` }"></span>
        </div>
        <ul class="wallet-allocation-legend">
          <li>
            <span class="wallet-swatch is-usd" aria-hidden="true"></span>
            <span class="wallet-legend-asset">USD</span>
            <span class="lt-num">{{ formatDecimal(equity.allocation.usd, 1) }}%</span>
            <span class="lt-num lt-muted">{{ formatDecimal(equity.usd, 2) }} USD</span>
          </li>
          <li>
            <span class="wallet-swatch is-btc" aria-hidden="true"></span>
            <span class="wallet-legend-asset">BTC</span>
            <span class="lt-num">{{ equity.priced ? `${formatDecimal(equity.allocation.btc, 1)}%` : '–' }}</span>
            <span class="lt-num lt-muted">{{ formatDecimal(equity.btc, 8) }} BTC<template v-if="equity.btcInUsd !== undefined"> ≈ {{ formatDecimal(equity.btcInUsd, 2) }} USD</template></span>
          </li>
        </ul>
      </div>
      <div v-else class="wallet-equity-empty">
        <p class="lt-muted">Sua carteira está vazia. Deposite USD para comprar ou BTC para vender.</p>
        <LtButton variant="primary" @click="emit('deposit')">Fazer o primeiro depósito</LtButton>
      </div>
    </template>
  </section>
</template>
