import './ui/orders.css';

export { ordersApiKey } from './application/ordersApiProvider';
export { ordersQueryKey } from './application/useOrders';
export { default as OrdersTable } from './ui/OrdersTable.vue';
export { default as OrderDetail } from './ui/OrderDetail.vue';
export type { OrdersApi } from './infra/orders.api';
