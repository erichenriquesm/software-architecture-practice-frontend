import type { HttpClient } from '@/shared/api/httpClient';

export interface AssetBalanceResponse {
  readonly assetId: string;
  readonly quantity: string;
  readonly available: string;
  readonly reserved: string;
}

export interface AccountResponse {
  readonly accountId: string;
  readonly name: string;
  readonly email: string;
  readonly document: string;
  readonly assets: readonly AssetBalanceResponse[];
}

export interface MovementRequest {
  readonly assetId: string;
  readonly quantity: string;
}

export interface WalletApi {
  account(accountId: string): Promise<AccountResponse>;
  deposit(request: MovementRequest, idempotencyKey: string): Promise<void>;
  withdraw(request: MovementRequest, idempotencyKey: string): Promise<void>;
}

export const createWalletApi = (http: HttpClient): WalletApi => ({
  account: (accountId) => http.get<AccountResponse>(`/accounts/${encodeURIComponent(accountId)}`),
  deposit: (request, idempotencyKey) => http.post<void>('/deposit', { body: request, idempotencyKey }),
  withdraw: (request, idempotencyKey) => http.post<void>('/withdraw', { body: request, idempotencyKey }),
});
