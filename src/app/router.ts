import { createRouter, createWebHistory } from 'vue-router';
import type { Router } from 'vue-router';
import { useIdentityApi, useSessionStore } from '@/contexts/identity';
import { defaultMarketId } from '@/entities/market';

declare module 'vue-router' {
  interface RouteMeta {
    /** Every route says who may open it; nothing is protected by default by accident. */
    readonly access: 'signedIn' | 'guest' | 'anyone';
  }
}

export const createAppRouter = (): Router => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', redirect: `/mercado/${defaultMarketId}`, meta: { access: 'anyone' } },
      { path: '/entrar', name: 'login', component: () => import('@/pages/LoginPage.vue'), meta: { access: 'guest' } },
      { path: '/cadastro', name: 'signup', component: () => import('@/pages/SignupPage.vue'), meta: { access: 'guest' } },
      { path: '/mercado/:marketId', name: 'market', component: () => import('@/pages/MarketPage.vue'), meta: { access: 'signedIn' } },
      { path: '/carteira', name: 'wallet', component: () => import('@/pages/WalletPage.vue'), meta: { access: 'signedIn' } },
      { path: '/ordens', name: 'orders', component: () => import('@/pages/OrdersPage.vue'), meta: { access: 'signedIn' } },
      { path: '/ordens/:orderId', name: 'order', component: () => import('@/pages/OrderPage.vue'), meta: { access: 'signedIn' } },
      { path: '/:path(.*)*', name: 'notFound', component: () => import('@/pages/NotFoundPage.vue'), meta: { access: 'anyone' } },
    ],
  });

  router.beforeEach(async (to) => {
    const session = useSessionStore();
    await session.restore(useIdentityApi());
    if (to.meta.access === 'signedIn' && !session.isAuthenticated) return { name: 'login', query: { voltar: to.fullPath } };
    if (to.meta.access === 'guest' && session.isAuthenticated) return { path: '/' };
    return true;
  });

  return router;
};
