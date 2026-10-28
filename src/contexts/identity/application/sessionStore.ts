import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { isApiError } from '@/shared/api/apiError';
import { setLogAccount } from '@/shared/observability/logger';
import type { IdentityApi, MeResponse } from '../infra/identity.api';

export type SessionStatus = 'unknown' | 'anonymous' | 'authenticated';

/** Who is signed in. The session itself is an HttpOnly cookie the app never reads; /me is the only source. */
export const useSessionStore = defineStore('session', () => {
  const user = ref<MeResponse | undefined>(undefined);
  const status = ref<SessionStatus>('unknown');

  const signedIn = (me: MeResponse) => {
    user.value = me;
    status.value = 'authenticated';
    setLogAccount(me.accountId);
  };

  const signedOut = () => {
    user.value = undefined;
    status.value = 'anonymous';
    setLogAccount(undefined);
  };

  /** Asks /me once per page load; a 401 just means nobody is signed in. */
  const restore = async (api: IdentityApi): Promise<void> => {
    if (status.value !== 'unknown') return;
    try {
      signedIn(await api.me());
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthenticated') return signedOut();
      throw error;
    }
  };

  return { user, status, isAuthenticated: computed(() => status.value === 'authenticated'), signedIn, signedOut, restore };
});
