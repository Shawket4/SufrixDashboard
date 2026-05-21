import { apiClient } from "@/shared/api/client";
import type { AdvisorReport } from "./types";
import { useQuery } from "@tanstack/react-query";

export const fetchAdvisorReport = async (orgId: string, windowDays: number = 30): Promise<AdvisorReport> => {
  const { data } = await apiClient.get<AdvisorReport>("/menu-advisor/report", {
    params: { org_id: orgId, window_days: windowDays },
  });
  return data;
};

export const useAdvisorReport = (orgId: string | undefined, windowDays: number = 30) => {
  return useQuery({
    queryKey: ["advisor-report", orgId, windowDays],
    queryFn: () => {
      if (!orgId) throw new Error("Org ID is required");
      return fetchAdvisorReport(orgId, windowDays);
    },
    enabled: !!orgId,
  });
};
