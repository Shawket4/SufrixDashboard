import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, ChevronRight, Shield, X } from "lucide-react";
import { PageShell } from "@/shared/ui/page-shell";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import { permissionApi } from "@/entities/permission/api";
import { usePermissionMatrix } from "@/entities/permission/queries";
import { useUsers } from "@/entities/user/queries";
import { QUERY_KEYS } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import type { PermissionMatrix } from "@/shared/types";

const RESOURCES = [
  "orders",
  "shifts",
  "branches",
  "users",
  "menu_items",
  "categories",
  "addon_items",
  "inventory",
  "inventory_adjustments",
  "inventory_transfers",
  "recipes",
  "permissions",
  "shift_counts",
];

const ACTIONS = ["read", "create", "update", "delete"] as const;

export default function Permissions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId } = useParams<{ userId?: string }>();
  const { user: authUser, orgId } = useCurrentContext();
  const [selUser, setSelUser] = useState<string | null>(userId ?? null);

  const { data: users = [], isLoading: usersLoading } = useUsers(orgId);
  const { data: matrix = [], isLoading: matrixLoading } = usePermissionMatrix(selUser);

  const upsert = useMutation({
    mutationFn: (data: { resource: string; action: string; granted: boolean }) =>
      permissionApi.upsert(selUser!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.permissions(selUser ?? "") }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeOverride = useMutation({
    mutationFn: ({ resource, action }: { resource: string; action: string }) =>
      permissionApi.remove(selUser!, resource, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.permissions(selUser ?? "") }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const getCell = (resource: string, action: string): PermissionMatrix | undefined =>
    matrix.find((m) => m.resource === resource && m.action === action);

  const handleToggle = (resource: string, action: string, cell: PermissionMatrix | undefined) => {
    if (!cell) return;
    if (cell.user_override !== null) {
      removeOverride.mutate({ resource, action });
    } else {
      upsert.mutate({ resource, action, granted: !cell.role_default });
    }
  };

  const selected = users.find((u) => u.id === selUser);

  return (
    <PageShell title={t("permissions.title")} description={t("permissions.subtitle")}>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="rounded-xl border overflow-hidden bg-card">
          <div className="p-3 border-b bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("permissions.selectUser")}</p>
          </div>
          <ScrollArea className="h-[600px]">
            {usersLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              users
                .filter((u) => u.id !== authUser?.id)
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelUser(u.id); navigate(`/permissions/${u.id}`); }}
                    className={cn(
                      "w-full text-start px-4 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors flex items-center gap-3",
                      selUser === u.id && "bg-accent",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t(`roles.${u.role}`)}</p>
                    </div>
                    {selUser === u.id && <ChevronRight size={14} className="text-primary flex-shrink-0 rtl:rotate-180" />}
                  </button>
                ))
            )}
          </ScrollArea>
        </div>

        <div className="rounded-xl border overflow-hidden bg-card">
          {!selUser ? (
            <EmptyState icon={Shield} title={t("permissions.selectUser")} description={t("permissions.selectUserHint")} className="h-[600px]" />
          ) : (
            <>
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div>
                  <p className="font-bold">{selected?.name}</p>
                  <p className="text-xs text-muted-foreground">{t("permissions.overridesApplied")}</p>
                </div>
                {selected && <Badge variant="info">{t(`roles.${selected.role}`)}</Badge>}
              </div>

              <ScrollArea className="h-[560px]">
                {matrixLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b z-10">
                      <tr>
                        <th className="text-start px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("permissions.resource")}
                        </th>
                        {ACTIONS.map((a) => (
                          <th key={a} className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t(`permissions.actions.${a}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RESOURCES.map((resource) => (
                        <tr key={resource} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-sm">
                            {t(`permissions.resources.${resource}`, { defaultValue: resource.replace("_", " ") })}
                          </td>
                          {ACTIONS.map((action) => {
                            const cell = getCell(resource, action);
                            if (!cell) return <td key={action} className="px-3 py-3 text-center text-muted-foreground">—</td>;
                            const hasOverride = cell.user_override !== null;
                            const effective = cell.effective;
                            return (
                              <td key={action} className="px-3 py-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    onClick={() => handleToggle(resource, action, cell)}
                                    className={cn(
                                      "w-7 h-7 rounded flex items-center justify-center border transition-colors",
                                      hasOverride
                                        ? effective
                                          ? "bg-primary text-primary-foreground border-primary"
                                          : "bg-destructive/10 text-destructive border-destructive/30"
                                        : effective
                                          ? "bg-muted text-muted-foreground border-border"
                                          : "bg-muted text-muted-foreground/40 border-border",
                                    )}
                                    title={hasOverride ? t("permissions.override") : t("permissions.roleDefault")}
                                  >
                                    {effective ? <Check size={12} /> : <X size={12} />}
                                  </button>
                                  {hasOverride && (
                                    <span className="text-[9px] font-bold text-primary uppercase">{t("permissions.override")}</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </ScrollArea>

              <div className="p-3 border-t bg-muted/20 flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-primary/20 border border-primary/30" /> {t("permissions.overrideGranted")}</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-destructive/10 border border-destructive/30" /> {t("permissions.overrideDenied")}</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-muted border border-border" /> {t("permissions.roleDefault")}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
