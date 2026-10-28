import { inject } from 'vue';
import type { InjectionKey } from 'vue';
import { httpClient } from '@/shared/api/httpClient';
import { createWalletApi } from '../infra/wallet.api';
import type { WalletApi } from '../infra/wallet.api';

export const walletApiKey: InjectionKey<WalletApi> = Symbol('walletApi');

export const useWalletApi = (): WalletApi => inject(walletApiKey, () => createWalletApi(httpClient), true);
