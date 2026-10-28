import { inject } from 'vue';
import type { InjectionKey } from 'vue';
import { httpClient } from '@/shared/api/httpClient';
import { createMarketPreviewApi } from '../infra/marketPreview.api';
import type { MarketPreviewApi } from '../infra/marketPreview.api';

export const marketPreviewApiKey: InjectionKey<MarketPreviewApi> = Symbol('marketPreviewApi');

export const useMarketPreviewApi = (): MarketPreviewApi => inject(marketPreviewApiKey, () => createMarketPreviewApi(httpClient), true);
