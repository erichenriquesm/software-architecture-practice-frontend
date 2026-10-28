import { walletApiKey } from '@/contexts/wallet';
import { createWalletApi } from '@/contexts/wallet/infra/wallet.api';
import { createHttpClient } from '@/shared/api/httpClient';

export const accountId = '0199d5f4-2b9a-7c3e-9a51-2f1d3c4b5a69';

export const accountWith = (assets: readonly { assetId: string; available: string; reserved: string }[]) => ({
  accountId,
  name: 'Ana Souza',
  email: 'ana@example.com',
  document: '52998224725',
  assets: assets.map((asset) => ({ ...asset, quantity: asset.available })),
});

/** The real HTTP client, retrying without waiting, so retries stay fast. */
export const fastWalletApi = { [walletApiKey]: createWalletApi(createHttpClient({ sleep: () => Promise.resolve() })) };
