<script setup lang="ts">
const props = defineProps<{ filtered: boolean }>();
const emit = defineEmits<{ showAll: [] }>();
</script>

<template>
  <div class="orders-empty">
    <div class="orders-empty-art" aria-hidden="true">
      <span class="is-ask"></span><span class="is-ask"></span>
      <span class="orders-empty-mid"></span>
      <span class="is-bid"></span><span class="is-bid"></span>
    </div>
    <div class="orders-empty-copy">
      <template v-if="!props.filtered">
        <p class="lt-panel-title">Nenhuma ordem ainda</p>
        <p class="lt-muted">Escolha um preço no livro e envie uma ordem limitada pela boleta do mercado.</p>
        <RouterLink to="/" class="orders-empty-action">Ir para o mercado</RouterLink>
      </template>
      <template v-else>
        <p class="lt-panel-title">Nenhuma ordem com esse status</p>
        <p class="lt-muted">Troque o filtro ou envie uma ordem pela boleta do mercado.</p>
        <button type="button" class="orders-empty-action" @click="emit('showAll')">Ver todas as ordens</button>
      </template>
    </div>
  </div>
</template>
