import client from "@/lib/client";
import type { InventoryItem, InventoryAdjustment, InventoryTransfer, ServePool, SoftServeBatch } from "@/types";

// Items
export const getInventoryItems   = (branchId: string)             => client.get<InventoryItem[]>(`/inventory/branches/${branchId}/items`);
export const createInventoryItem = (branchId: string, data: Record<string, unknown>) => client.post<InventoryItem>(`/inventory/branches/${branchId}/items`, data);
export const updateInventoryItem = (id: string, data: Record<string, unknown>) => client.patch<InventoryItem>(`/inventory/items/${id}`, data);
export const deleteInventoryItem = (id: string)                   => client.delete(`/inventory/items/${id}`);
export const getInventoryItemsByOrg = (orgId: string) =>
  client.get<InventoryItem[]>(`/inventory/orgs/${orgId}/items`);

// Adjustments
export const getAdjustments   = (branchId: string)             => client.get<InventoryAdjustment[]>(`/inventory/branches/${branchId}/adjustments`);
export const createAdjustment = (branchId: string, data: Record<string, unknown>) => client.post<InventoryAdjustment>(`/inventory/branches/${branchId}/adjustments`, data);

// Transfers
export const getTransfers    = (branchId: string, direction?: string) =>
  client.get<InventoryTransfer[]>(`/inventory/branches/${branchId}/transfers`, { params: direction ? { direction } : {} });
export const createTransfer  = (data: Record<string, unknown>) => client.post<InventoryTransfer>("/inventory/transfers", data);
export const getTransfer     = (id: string)                    => client.get<InventoryTransfer>(`/inventory/transfers/${id}`);
export const confirmTransfer = (id: string, data: Record<string, unknown>) => client.patch<InventoryTransfer>(`/inventory/transfers/${id}/confirm`, data);
export const rejectTransfer  = (id: string, data: Record<string, unknown>) => client.patch<InventoryTransfer>(`/inventory/transfers/${id}/reject`, data);

// Soft serve
export const getSoftServePools   = (branchId: string)             => client.get<ServePool[]>(`/soft-serve/branches/${branchId}/pools`);
export const getSoftServeBatches = (branchId: string)             => client.get<SoftServeBatch[]>(`/soft-serve/branches/${branchId}/batches`);
export const createSoftServeBatch = (branchId: string, data: Record<string, unknown>) => client.post(`/soft-serve/branches/${branchId}/batches`, data);
