import { createPinia } from 'pinia';
import { describe, expect, test } from 'vitest';
import { createApp } from 'vue';
import { createAppRouter } from '@/app/router';
import { useSessionStore } from '@/contexts/identity';

/** The app's own router in a bare app, with the session already known so the guard does not ask /me. */
const appRouter = (signedIn: boolean) => {
  const pinia = createPinia();
  const router = createAppRouter();
  createApp({ render: () => null }).use(pinia).use(router);
  const session = useSessionStore(pinia);
  if (signedIn) session.signedIn({ accountId: 'a-1', name: 'Ana Souza', email: 'ana@example.com' });
  else session.signedOut();
  return router;
};

describe('Page titles', () => {
  test.each([
    ['/mercado/BTC-USD', 'Mercado BTC-USD · Lastro'],
    ['/carteira', 'Carteira · Lastro'],
    ['/ordens', 'Ordens · Lastro'],
    ['/ordens/o-1', 'Ordem · Lastro'],
    ['/nada-aqui', 'Página não encontrada · Lastro'],
  ])('Should name the tab after the screen at %s', async (path, title) => {
    const router = appRouter(true);
    await router.push(path);
    expect(document.title).toBe(title);
  });

  test.each([
    ['/entrar', 'Entrar · Lastro'],
    ['/cadastro', 'Criar conta · Lastro'],
  ])('Should name the guest screen at %s', async (path, title) => {
    const router = appRouter(false);
    await router.push(path);
    expect(document.title).toBe(title);
  });

  test('Should name the screen the guard lands on, not the one asked for', async () => {
    const router = appRouter(false);
    await router.push('/carteira');
    expect(router.currentRoute.value.name).toBe('login');
    expect(document.title).toBe('Entrar · Lastro');
  });
});
