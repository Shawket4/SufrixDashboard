import { apiClient } from "@/shared/api/client";
import type { CashMovement, Shift, ShiftPreFill, ShiftReport } from "@/shared/types";

export const shiftApi = {
  getCurrent: (branchId: string) =>
    apiClient.get<ShiftPreFill>(`/shifts/branches/${branchId}/current`).then((r) => r.data),
  listByBranch: (branchId: string) => apiClient.get<Shift[]>(`/shifts/branches/${branchId}`).then((r) => r.data),
  get: (id: string) => apiClient.get<Shift>(`/shifts/${id}`).then((r) => r.data),
  open: (branchId: string, data: { opening_cash: number }) =>
    apiClient.post<Shift>(`/shifts/branches/${branchId}/open`, data).then((r) => r.data),
  close: (id: string, data: { closing_cash_declared: number; notes?: string | null }) =>
    apiClient.post(`/shifts/${id}/close`, data).then(() => undefined),
  forceClose: (id: string, data: { reason: string }) =>
    apiClient.post<Shift>(`/shifts/${id}/force-close`, data).then((r) => r.data),
  listMovements: (id: string) => apiClient.get<CashMovement[]>(`/shifts/${id}/cash-movements`).then((r) => r.data),
  addMovement: (id: string, data: { amount: number; note: string }) =>
    apiClient.post<CashMovement>(`/shifts/${id}/cash-movements`, data).then((r) => r.data),
  report: (id: string) => apiClient.get<ShiftReport>(`/shifts/${id}/report`).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/shifts/${id}`).then(() => undefined),
};
