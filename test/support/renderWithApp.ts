import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { render } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import type { Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

/** Renders a component with the same plugins as the app: Pinia, Vue Query without retries, an in-memory router. */
export const renderWithApp = async (component: Component, options: { props?: Record<string, unknown>; provide?: Record<symbol, unknown> } = {}) => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:path(.*)*', component: { template: '<div></div>' } }] });
  await router.push('/');
  const rendered = render(component, {
    props: options.props ?? {},
    global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]], provide: options.provide ?? {} },
  });
  return { ...rendered, pinia, queryClient, router };
};
