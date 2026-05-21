import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/entities/auth/api";
import { useCurrentContext } from "./use-current-context";
import type { Role } from "@/shared/config/constants";

// Frontend role-default matrix. This mirrors the backend defaults for UI
// gating only — the backend remains the source of truth on mutations.
// Per-user overrides are fetched via the permissions API for the Permissions page
// (this hook handles coarse-grain gating only).
const ROLE_DEFAULTS: Record<Role, Record<string, Partial<Record<string, boolean>>>> = {
  super_admin: {
    // Super admin can do everything
    "*": { "*": true },
  },
  org_admin: {
    orgs: { read: true, update: true },
    branches: { read: true, create: true, update: true, delete: true },
    users: { read: true, create: true, update: true, delete: true },
    menu_items: { read: true, create: true, update: true, delete: true },
    categories: { read: true, create: true, update: true, delete: true },
    addon_items: { read: true, create: true, update: true, delete: true },
    recipes: { read: true, create: true, update: true, delete: true },
    inventory: { read: true, create: true, update: true, delete: true },
    inventory_adjustments: { read: true, create: true },
    inventory_transfers: { read: true, create: true, update: true, delete: true },
    discounts: { read: true, create: true, update: true, delete: true },
    orders: { read: true, update: true },
    shifts: { read: true, update: true },
    permissions: { read: true, create: true, update: true, delete: true },
  },
  branch_manager: {
    branches: { read: true },
    users: { read: true, create: true, update: true },
    menu_items: { read: true },
    categories: { read: true },
    addon_items: { read: true },
    inventory: { read: true, update: true },
    inventory_adjustments: { read: true, create: true },
    inventory_transfers: { read: true, create: true },
    orders: { read: true, update: true },
    shifts: { read: true, create: true, update: true },
    discounts: { read: true },
  },
  teller: {
    menu_items: { read: true },
    categories: { read: true },
    addon_items: { read: true },
    orders: { read: true, create: true },
    shifts: { read: true, create: true, update: true },
    discounts: { read: true },
  },
};

export const usePermissions = () => {
  const { user } = useCurrentContext();

  const { data } = useQuery({
    queryKey: ["auth-permissions", user?.id],
    queryFn: () => authApi.getPermissions(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    // Build a lookup map: resource -> action -> granted
    const map: Record<string, Record<string, boolean>> = {};
    if (data?.permissions) {
      for (const p of data.permissions) {
        if (!map[p.resource]) map[p.resource] = {};
        map[p.resource][p.action] = p.granted;
      }
    }

    return {
      can: (resource: string, action: string): boolean => {
        if (!user) return false;
        // Super admin can do everything
        if (user.role === "super_admin") return true;

        // If we have API-loaded effective permissions, use them as ground truth if defined
        if (data?.permissions) {
          const apiGranted = map[resource]?.[action];
          if (apiGranted !== undefined) {
            return apiGranted;
          }
        }

        // Fallback to role-defaults
        const table = ROLE_DEFAULTS[user.role as Role];
        if (!table) return false;
        if (table["*"]?.["*"]) return true;
        return Boolean(table[resource]?.[action]);
      },
      role: user?.role ?? null,
      isLoading: !data && !!user,
    };
  }, [user, data]);
};
