<script setup lang="ts">
import { computed } from 'vue';
import { decimalsOfAsset, formatDecimal, useFlash } from '@/lastro';
import { holdingSplit, holdingTotalOf } from '../domain/portfolio';
import type { Holding } from '../domain/portfolio';
import { assetNameOf } from './assetGlyph';

const props = defineProps<{ holding: Holding; index: number }>();
const decimals = computed(() => decimalsOfAsset(props.holding.assetId));
const split = computed(() => holdingSplit(props.holding));
const total = computed(() => holdingTotalOf(props.holding));
const { flashClass, flashKey } = useFlash(() => props.holding.available);
</script>

<template>
  <tr class="wallet-asset-row lt-rise" :class="`lt-rise-${Math.min(index + 1, 4)}`">
    <th scope="row">
      <span class="wallet-asset">
        <span :class="['wallet-glyph', `is-${holding.assetId.toLowerCase()}`]">{{ holding.assetId }}</span>
        <span class="wallet-asset-name">{{ assetNameOf(holding.assetId) }}</span>
      </span>
    </th>
    <td class="is-num"><span :key="flashKey" :class="['wallet-flash', flashClass]">{{ formatDecimal(holding.available, decimals) }}</span></td>
    <td class="is-num is-muted">{{ formatDecimal(holding.reserved, decimals) }}</td>
    <td class="is-num wallet-col-total">{{ formatDecimal(total, decimals) }}</td>
    <td class="wallet-col-split">
      <span class="wallet-split" role="img" :aria-label="`${formatDecimal(split.available, 0)}% disponível, ${formatDecimal(split.reserved, 0)}% em ordens`">
        <span class="wallet-split-free" :style="{ width: `${split.available}%` }"></span>
        <span class="wallet-split-locked" :style="{ width: `${split.reserved}%` }"></span>
      </span>
    </td>
  </tr>
</template>
