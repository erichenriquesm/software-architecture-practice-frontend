<script setup lang="ts">
import { LtButton } from '@/lastro';

const props = defineProps<{ rateLimited?: boolean | undefined }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div role="alert" class="market-notice">
    <span>
      <strong>Dados de mercado atrasados.</strong>
      <span class="lt-muted">
        {{ props.rateLimited ? 'Muitas consultas em pouco tempo; a próxima atualização espera o limite liberar.' : 'Mostramos os últimos dados recebidos e tentamos de novo a cada 2 s.' }}
      </span>
    </span>
    <LtButton variant="ghost" size="sm" @click="emit('retry')">Tentar agora</LtButton>
  </div>
</template>
