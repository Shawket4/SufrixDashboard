import { apiClient } from "@/shared/api/client";
import type { Order, OrdersQuery, PaginatedOrders, ExportResponse } from "@/shared/types";

export const orderApi = {
  list: (params: OrdersQuery) => apiClient.get<PaginatedOrders>("/orders", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),
  void: (id: string, data: { reason: string; restore_inventory?: boolean }) =>
    apiClient.post<Order>(`/orders/${id}/void`, data).then((r) => r.data),
  export: (params: OrdersQuery) =>
    apiClient.get<ExportResponse>("/orders/export", { params }).then((r) => r.data),
};
