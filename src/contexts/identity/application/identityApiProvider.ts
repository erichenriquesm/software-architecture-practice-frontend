import { inject } from 'vue';
import type { InjectionKey } from 'vue';
import { httpClient } from '@/shared/api/httpClient';
import { createIdentityApi } from '../infra/identity.api';
import type { IdentityApi } from '../infra/identity.api';

export const identityApiKey: InjectionKey<IdentityApi> = Symbol('identityApi');

/** Tests provide a fake under identityApiKey; the app gets the real one. */
export const useIdentityApi = (): IdentityApi => inject(identityApiKey, () => createIdentityApi(httpClient), true);
