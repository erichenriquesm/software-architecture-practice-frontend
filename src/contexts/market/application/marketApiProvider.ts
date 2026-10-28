import { inject } from 'vue';
import type { InjectionKey } from 'vue';
import { httpClient } from '@/shared/api/httpClient';
import { createMarketApi } from '../infra/market.api';
import type { MarketApi } from '../infra/market.api';

export const marketApiKey: InjectionKey<MarketApi> = Symbol('marketApi');

/** Tests provide a fake under marketApiKey; the app gets the real one. */
export const useMarketApi = (): MarketApi => inject(marketApiKey, () => createMarketApi(httpClient), true);
