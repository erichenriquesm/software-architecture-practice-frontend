<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from './AppHeader.vue';

const route = useRoute();
const showHeader = computed(() => route.meta.access === 'signedIn');
</script>

<template>
  <div class="app-shell">
    <AppHeader v-if="showHeader" />
    <RouterView />
  </div>
</template>
