<script setup lang="ts">
export type LtOrderStatus = 'pending' | 'open' | 'partiallyFilled' | 'filled' | 'cancelling' | 'cancelled' | 'rejected' | 'expired';

const props = defineProps<{ status: LtOrderStatus; labels?: Partial<Record<LtOrderStatus, string>> | undefined }>();
const defaults: Record<LtOrderStatus, string> = {
  pending: 'Recebida',
  open: 'Aberta',
  partiallyFilled: 'Parcial',
  filled: 'Executada',
  cancelling: 'Cancelando',
  cancelled: 'Cancelada',
  rejected: 'Rejeitada',
  expired: 'Expirada',
};
const tones: Record<LtOrderStatus, string> = {
  pending: 'open',
  open: 'open',
  partiallyFilled: 'partial',
  filled: 'filled',
  cancelling: 'cancelled',
  cancelled: 'cancelled',
  rejected: 'rejected',
  expired: 'cancelled',
};
</script>

<template>
  <span :class="['lt-badge', `lt-badge-${tones[props.status]}`]">{{ props.labels?.[props.status] ?? defaults[props.status] }}</span>
</template>
