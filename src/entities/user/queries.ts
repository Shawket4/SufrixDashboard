import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/config/constants";
import { userApi } from "./api";

export const useUsers = (orgId: string | null, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: QUERY_KEYS.users(orgId),
    queryFn: () => userApi.list(orgId),
    enabled: orgId !== null && (options?.enabled ?? true),
  });

export const useUserBranches = (userId: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.userBranches(userId ?? ""), queryFn: () => userApi.listBranches(userId!), enabled: !!userId });
