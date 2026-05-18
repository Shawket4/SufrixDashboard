import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/config/constants";
import { branchApi } from "./api";

export const useBranches = (orgId: string | null, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: QUERY_KEYS.branches(orgId),
    queryFn: () => branchApi.list(orgId!),
    enabled: orgId !== null && (options?.enabled ?? true),
  });

export const useBranch = (id: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.branch(id ?? ""), queryFn: () => branchApi.get(id!), enabled: !!id });
