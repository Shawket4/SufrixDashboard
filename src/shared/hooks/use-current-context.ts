import { useMemo } from "react";
import { useAuthStore } from "@/shared/auth/store";
import { useAppStore } from "@/shared/auth/app-store";
import type { Role } from "@/shared/config/constants";
import type { UserPublic } from "@/shared/types";

export interface CurrentContext {
  /** The signed-in user, or null if not authenticated. */
  user: UserPublic | null;
  /** Role of signed-in user (undefined when no user) */
  role: Role | null;
  /**
   * The "active" org ID:
   *   - super_admin: whatever they picked in the org switcher (can be null = all)
   *   - org_admin/branch_manager/teller: always their own org_id
   */
  orgId: string | null;
  /** The persisted logo URL of the active organization. */
  orgLogo: string | null;
  /**
   * The "active" branch ID:
   *   - super_admin/org_admin: whatever they picked in the branch switcher (can be null = all/none)
   *   - branch_manager/teller: their primary branch (if set) or the switched-to branch
   */
  branchId: string | null;
  /** True when user is signed in AND an org is resolvable (for queries that need one) */
  isReady: boolean;
  /** Convenience booleans for UI gating */
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  canManageOrg: boolean;
  canManageBranch: boolean;
}

/**
 * THE context hook. Every TanStack query and API call in the application MUST
 * consume `orgId` / `branchId` from this hook, NOT from Zustand directly. This
 * prevents the "stale context in closure" class of bugs where one store updates
 * but a consumer captured the old value.
 */
export const useCurrentContext = (): CurrentContext => {
  const user = useAuthStore((s) => s.user);
  const selectedOrgId = useAppStore((s) => s.selectedOrgId);
  const selectedOrgLogo = useAppStore((s) => s.selectedOrgLogo);
  const selectedBranchId = useAppStore((s) => s.selectedBranchId);

  return useMemo<CurrentContext>(() => {
    const role = (user?.role ?? null) as Role | null;
    const isSuperAdmin = role === "super_admin";
    const isOrgAdmin = role === "org_admin";

    // Non-super admins can never view data outside their own org
    const orgId = isSuperAdmin ? selectedOrgId : (user?.org_id ?? null);

    // Branch managers / tellers default to their assigned branch; otherwise to
    // the explicitly selected one. Super admins / org admins pick via switcher.
    const branchId =
      role === "branch_manager" || role === "teller"
        ? (user?.branch_id ?? selectedBranchId)
        : selectedBranchId;

    return {
      user,
      role,
      orgId,
      orgLogo: selectedOrgLogo,
      branchId,
      isReady: Boolean(user) && (isSuperAdmin || Boolean(orgId)),
      isSuperAdmin,
      isOrgAdmin,
      canManageOrg: isSuperAdmin || isOrgAdmin,
      canManageBranch: isSuperAdmin || isOrgAdmin || role === "branch_manager",
    };
  }, [user, selectedOrgId, selectedBranchId, selectedOrgLogo]);
};
