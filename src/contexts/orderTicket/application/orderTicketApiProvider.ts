import { inject } from 'vue';
import type { InjectionKey } from 'vue';
import { httpClient } from '@/shared/api/httpClient';
import { createOrderTicketApi } from '../infra/orderTicket.api';
import type { OrderTicketApi } from '../infra/orderTicket.api';

export const orderTicketApiKey: InjectionKey<OrderTicketApi> = Symbol('orderTicketApi');

/** Tests provide a fake under orderTicketApiKey; the app gets the real one. */
export const useOrderTicketApi = (): OrderTicketApi => inject(orderTicketApiKey, () => createOrderTicketApi(httpClient), true);
