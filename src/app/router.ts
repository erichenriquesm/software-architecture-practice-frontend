import { createRouter, createWebHistory } from 'vue-router';
import type { RouteLocationNormalized, Router } from 'vue-router';
import { useIdentityApi, useSessionStore } from '@/contexts/identity';
import { defaultMarketId } from '@/entities/market';
import { createLogger } from '@/shared/observability/logger';

const logger = createLogger('router');

declare module 'vue-router' {
  interface RouteMeta {
    /** Every route says who may open it; nothing is protected by default by accident. */
    readonly access: 'signedIn' | 'guest' | 'anyone';
    /** What the browser tab says on this screen, before the brand. */
    readonly title?: string | ((route: RouteLocationNormalized) => string);
  }
}

const brand = 'Lastro';

/** "Carteira · Lastro": the screen first, so tabs and history tell them apart. */
export const pageTitle = (route: RouteLocationNormalized): string => {
  const { title } = route.meta;
  const screen = typeof title === 'function' ? title(route) : title;
  return screen ? `${screen} · ${brand}` : brand;
};

export const createAppRouter = (): Router => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', redirect: `/mercado/${defaultMarketId}`, meta: { access: 'anyone' } },
      { path: '/entrar', name: 'login', component: () => import('@/pages/LoginPage.vue'), meta: { access: 'guest', title: 'Entrar' } },
      { path: '/cadastro', name: 'signup', component: () => import('@/pages/SignupPage.vue'), meta: { access: 'guest', title: 'Criar conta' } },
      { path: '/mercado/:marketId', name: 'market', component: () => import('@/pages/MarketPage.vue'), meta: { access: 'signedIn', title: (route) => `Mercado ${String(route.params.marketId)}` } },
      { path: '/carteira', name: 'wallet', component: () => import('@/pages/WalletPage.vue'), meta: { access: 'signedIn', title: 'Carteira' } },
      { path: '/ordens', name: 'orders', component: () => import('@/pages/OrdersPage.vue'), meta: { access: 'signedIn', title: 'Ordens' } },
      { path: '/ordens/:orderId', name: 'order', component: () => import('@/pages/OrderPage.vue'), meta: { access: 'signedIn', title: 'Ordem' } },
      { path: '/:path(.*)*', name: 'notFound', component: () => import('@/pages/NotFoundPage.vue'), meta: { access: 'anyone', title: 'Página não encontrada' } },
    ],
  });

  router.beforeEach(async (to) => {
    const session = useSessionStore();
    try {
      await session.restore(useIdentityApi());
    } catch (error) {
      // The API is unreachable: treat this navigation as signed out; the next one asks /me again
      logger.warn('session check failed', { error: error instanceof Error ? error.message : String(error) });
    }
    if (to.meta.access === 'signedIn' && !session.isAuthenticated) return { name: 'login', query: { voltar: to.fullPath } };
    if (to.meta.access === 'guest' && session.isAuthenticated) return { path: '/' };
    return true;
  });

  router.afterEach((to, _from, failure) => {
    if (!failure) document.title = pageTitle(to);
  });

  return router;
};
