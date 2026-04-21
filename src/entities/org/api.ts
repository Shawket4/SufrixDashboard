import { apiClient } from "@/shared/api/client";
import type { Org } from "@/shared/types";

export const orgApi = {
  list: () => apiClient.get<Org[]>("/orgs").then((r) => r.data),

  get: (id: string) => apiClient.get<Org>(`/orgs/${id}`).then((r) => r.data),

  create: (
    data: {
      name: string;
      slug: string;
      currency_code?: string;
      tax_rate?: number;
      receipt_footer?: string | null;
    },
    logo?: File,
  ) => {
    const form = new FormData();
    form.append("name", data.name);
    form.append("slug", data.slug);
    if (data.currency_code) form.append("currency_code", data.currency_code);
    if (data.tax_rate != null) form.append("tax_rate", String(data.tax_rate));
    if (data.receipt_footer) form.append("receipt_footer", data.receipt_footer);
    if (logo) form.append("logo", logo);
    return apiClient.post<Org>("/orgs", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  update: (id: string, data: Partial<Omit<Org, "id">>) =>
    apiClient.patch<Org>(`/orgs/${id}`, data).then((r) => r.data),

  uploadLogo: (id: string, file: File) => {
    const form = new FormData();
    form.append("logo", file);
    return apiClient.put<Org>(`/orgs/${id}/logo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  remove: (id: string) => apiClient.delete(`/orgs/${id}`).then(() => undefined),
};