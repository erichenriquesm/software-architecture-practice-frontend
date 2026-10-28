import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import '@/lastro';
import { useSessionStore } from '@/contexts/identity';
import { sessionEndedReason } from '@/shared/navigation/returnPath';
import { createLogger } from '@/shared/observability/logger';
import App from './App.vue';
import './app.css';
import { createAppQueryClient } from './queryClient';
import { createAppRouter } from './router';

const logger = createLogger('app');
const app = createApp(App);
const pinia = createPinia();
const router = createAppRouter();

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, {
  queryClient: createAppQueryClient(() => {
    useSessionStore(pinia).signedOut();
    // Requests still in flight can find the session over too: once on the sign-in screen, they leave it alone
    if (router.currentRoute.value.name === 'login') return;
    void router.push({ name: 'login', query: { voltar: router.currentRoute.value.fullPath, ...sessionEndedReason } });
  }),
});
app.config.errorHandler = (error, _instance, info) => logger.error('unhandled error', { info, error: error instanceof Error ? error.message : String(error) });

app.mount('#app');
