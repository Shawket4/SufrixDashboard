import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/config/constants";
import { orgApi } from "./api";

export const useOrgs = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: QUERY_KEYS.orgs,
    queryFn: orgApi.list,
    enabled: options?.enabled ?? true,
  });
export const useOrg = (id: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.org(id ?? ""), queryFn: () => orgApi.get(id!), enabled: !!id });
