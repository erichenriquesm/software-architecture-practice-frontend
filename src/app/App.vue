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
    <RouterView v-slot="{ Component, route: current }">
      <Transition name="lt-page" :duration="{ enter: 320, leave: 0 }">
        <component :is="Component" :key="current.path" />
      </Transition>
    </RouterView>
  </div>
</template>
