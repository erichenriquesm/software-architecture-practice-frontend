import { inject } from 'vue';
import type { InjectionKey } from 'vue';
import { httpClient } from '@/shared/api/httpClient';
import { createOrdersApi } from '../infra/orders.api';
import type { OrdersApi } from '../infra/orders.api';

export const ordersApiKey: InjectionKey<OrdersApi> = Symbol('ordersApi');

export const useOrdersApi = (): OrdersApi => inject(ordersApiKey, () => createOrdersApi(httpClient), true);
