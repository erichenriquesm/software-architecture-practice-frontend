import type { HttpClient } from '@/shared/api/httpClient';

export interface SignupRequest {
  readonly name: string;
  readonly email: string;
  readonly document: string;
  readonly password: string;
}

export interface SignupResponse {
  readonly accountId: string;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface MeResponse {
  readonly accountId: string;
  readonly name: string;
  readonly email: string;
}

export interface IdentityApi {
  signup(request: SignupRequest): Promise<SignupResponse>;
  login(request: LoginRequest): Promise<void>;
  logout(): Promise<void>;
  me(): Promise<MeResponse>;
}

export const createIdentityApi = (http: HttpClient): IdentityApi => ({
  signup: (request) => http.post<SignupResponse>('/signup', { body: request }),
  login: (request) => http.post<void>('/login', { body: request }),
  logout: () => http.post<void>('/logout'),
  me: () => http.get<MeResponse>('/me'),
});
