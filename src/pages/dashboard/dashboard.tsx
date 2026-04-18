import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, BarChart2, Building2, Clock, Coffee, GitBranch,
  LayoutGrid, Package, Receipt, ShoppingBag, Users as UsersIcon,
} from "lucide-react";
import { PageShell } from "@/shared/ui/page-shell";
import { StatCard } from "@/shared/ui/stat-card";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { useOrgs } from "@/entities/org/queries";
import { useBranches } from "@/entities/branch/queries";
import { useUsers } from "@/entities/user/queries";
import { useCurrentShift } from "@/entities/shift/queries";
import { useBranchSales } from "@/entities/report/queries";
import { useBranchStockReport } from "@/entities/report/queries";
import { useOrders } from "@/entities/order/queries";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { cairoDateISO, fmtDateTime, fmtDuration, fmtMoney } from "@/shared/lib/format";
import { apiClient } from "@/shared/api/client";
import type { BranchInventoryItem, Order, Shift } from "@/shared/types";
import { useQueries } from "@tanstack/react-query";
import { shiftApi } from "@/entities/shift/api";

const greet = (name: string, t: (k: string, p?: Record<string, unknown>) => string) => {
  const h = new Date().getHours();
  const key = h < 12 ? "greetingMorning" : h < 18 ? "greetingAfternoon" : "greetingEvening";
  return t(`dashboard.${key}`, { name });
};

// ── Branch card — shows open shift + quick stats ─────────────────────────────
function BranchCard({ branchId, branchName }: { branchId: string; branchName: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: pre } = useCurrentShift(branchId);
  const openShift = pre?.open_shift;

  // Today's sales
  const tdy = new Date();
  const from = cairoDateISO(tdy.getFullYear(), tdy.getMonth(), tdy.getDate());
  const to = cairoDateISO(tdy.getFullYear(), tdy.getMonth(), tdy.getDate(), true);
  const { data: sales } = useBranchSales(branchId, { from, to });

  // Stock for this branch
  const { data: stockReport } = useBranchStockReport(branchId);
  const lowStock = stockReport?.items.filter((s) => s.below_reorder).length ?? 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all"
      onClick={() => navigate("/orders")}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <GitBranch size={14} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">{branchName}</p>
              <p className="text-[10px] text-muted-foreground">
                {openShift ? `${t("shifts.shiftIsOpen")} · ${openShift.teller_name}` : t("dashboard.noActiveShift")}
              </p>
            </div>
          </div>
          {openShift && <Badge variant="success" className="text-[10px]">{t("shiftStatus.open")}</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted p-2">
            <p className="text-[10px] text-muted-foreground">{t("dashboard.todaySales")}</p>
            <p className="text-sm font-bold tabular">{sales ? fmtMoney(sales.total_revenue) : "—"}</p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-[10px] text-muted-foreground">{t("dashboard.orders")}</p>
            <p className="text-sm font-bold tabular">{sales?.total_orders ?? "—"}</p>
          </div>
        </div>

        {lowStock > 0 && (
          <div className="flex items-center gap-2 text-xs text-warning">
            <AlertTriangle size={11} />
            <span>{t("dashboard.lowStockItems", { count: lowStock })}</span>
          </div>
        )}

        {openShift && (
          <p className="text-[10px] text-muted-foreground">
            {t("dashboard.running")}: <span className="font-mono">{fmtDuration(openShift.opened_at)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Recent orders panel — auto-finds first branch with open shift ────────────
function RecentOrdersPanel({ openShiftInfo }: { openShiftInfo: { branchId: string; shift: Shift } | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data } = useOrders(
    { branch_id: openShiftInfo?.branchId, shift_id: openShiftInfo?.shift.id, per_page: 8, page: 1 },
    !!openShiftInfo,
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold flex items-center gap-2"><Receipt size={14} /> {t("dashboard.recentOrders")}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>{t("common.all")}</Button>
        </div>
        {!openShiftInfo ? (
          <EmptyState icon={Clock} title={t("dashboard.noShiftFound")} className="py-8" />
        ) : !data?.data?.length ? (
          <EmptyState icon={ShoppingBag} title={t("dashboard.noOrdersYet")} className="py-8" />
        ) : (
          <div className="space-y-2">
            {data.data.map((o: Order) => (
              <div key={o.id} onClick={() => navigate("/orders")} className="flex items-center gap-2 rounded-lg bg-muted/40 hover:bg-muted px-3 py-2 cursor-pointer">
                <span className="font-mono text-xs font-bold text-primary">#{o.order_number}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{o.customer_name ?? o.teller_name}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDateTime(o.created_at)}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{t(`payments.${o.payment_method}`)}</Badge>
                <span className="font-bold tabular text-xs">{fmtMoney(o.total_amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Low-stock panel — aggregates across all branches ─────────────────────────
function LowStockPanel({ branchIds }: { branchIds: string[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const results = useQueries({
    queries: branchIds.map((id) => ({
      queryKey: ["stock-low", id],
      queryFn: async () => {
        const res = await apiClient.get<BranchInventoryItem[]>(`/inventory/branches/${id}/stock`);
        return { branchId: id, items: res.data.filter((s) => s.below_reorder) };
      },
      enabled: !!id,
    })),
  });

  const all = results.flatMap((r) => (r.data?.items ?? []).map((i) => ({ ...i, _branchId: r.data?.branchId })));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold flex items-center gap-2"><Package size={14} /> {t("dashboard.lowStock")}</p>
          <Button variant="ghost" size="sm" onClick={() => navigate("/inventory")}>{t("common.all")}</Button>
        </div>
        {all.length === 0 ? (
          <EmptyState icon={Package} title={t("dashboard.allStockOk")} className="py-8" />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {all.slice(0, 12).map((s) => (
              <div key={`${s._branchId}-${s.id}`} className="flex items-center justify-between rounded-lg bg-warning/5 px-3 py-2 border border-warning/20">
                <div>
                  <p className="text-sm font-medium">{s.ingredient_name}</p>
                  <p className="text-[10px] text-muted-foreground tabular">
                    {Number(s.current_stock).toFixed(2)} / {Number(s.reorder_threshold).toFixed(2)} {s.unit}
                  </p>
                </div>
                <AlertTriangle size={14} className="text-warning" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role, orgId, isSuperAdmin } = useCurrentContext();

  const { data: orgs = [] } = useOrgs();
  const { data: branches = [] } = useBranches(orgId);
  const { data: users = [] } = useUsers(orgId);

  // For each branch, determine open shift (drives active count + "first open branch" for recent orders)
  const preFills = useQueries({
    queries: branches.map((b) => ({
      queryKey: ["shift-prefill", b.id],
      queryFn: () => shiftApi.getCurrent(b.id),
      refetchInterval: 60_000,
      enabled: !!b.id,
    })),
  });

  const openShiftInfo = useMemo(() => {
    for (let i = 0; i < preFills.length; i++) {
      const r = preFills[i];
      if (r.data?.has_open_shift && r.data.open_shift) {
        return { branchId: branches[i].id, shift: r.data.open_shift };
      }
    }
    return null;
  }, [preFills, branches]);

  const activeShiftCount = preFills.filter((r) => r.data?.has_open_shift).length;

  return (
    <PageShell
      title={user ? greet(user.name.split(" ")[0], t) : t("nav.dashboard")}
      description={role ? t("dashboard.subtitle") : undefined}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isSuperAdmin ? (
          <>
            <StatCard label={t("nav.orgs")} value={orgs.length} icon={Building2} onClick={() => navigate("/orgs")} />
            <StatCard label={t("users.totalUsers")} value={users.length} icon={UsersIcon} accent="info" onClick={() => navigate("/users")} />
            <StatCard label={t("nav.branches")} value={branches.length} icon={GitBranch} accent="violet" onClick={() => navigate("/branches")} />
            <StatCard label={t("dashboard.activeShifts")} value={activeShiftCount} icon={Clock} accent="success" />
          </>
        ) : (
          <>
            <StatCard label={t("users.totalUsers")} value={users.length} icon={UsersIcon} onClick={() => navigate("/users")} />
            <StatCard label={t("nav.branches")} value={branches.length} icon={GitBranch} accent="info" onClick={() => navigate("/branches")} />
            <StatCard label={t("dashboard.operating")} value={`${activeShiftCount}/${branches.length}`} icon={LayoutGrid} accent="violet" />
            <StatCard label={t("dashboard.activeShifts")} value={activeShiftCount} icon={Clock} accent="success" />
          </>
        )}
      </div>

      {/* Branch grid */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold flex items-center gap-2"><GitBranch size={14} /> {t("dashboard.branchStatus")}</p>
            <Button variant="ghost" size="sm" onClick={() => navigate("/branches")}>{t("common.all")}</Button>
          </div>
          {branches.length === 0 ? (
            <EmptyState icon={GitBranch} title={t("common.noResults")} className="py-8" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {branches.map((b) => <BranchCard key={b.id} branchId={b.id} branchName={b.name} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentOrdersPanel openShiftInfo={openShiftInfo} />
        <LowStockPanel branchIds={branches.map((b) => b.id)} />
      </div>

      {/* Quick actions */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-bold mb-3">{t("dashboard.quickActions")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button variant="outline" onClick={() => navigate("/orders")}><ShoppingBag /> {t("nav.orders")}</Button>
            <Button variant="outline" onClick={() => navigate("/shifts")}><Clock /> {t("nav.shifts")}</Button>
            <Button variant="outline" onClick={() => navigate("/analytics")}><BarChart2 /> {t("nav.analytics")}</Button>
            <Button variant="outline" onClick={() => navigate("/menu")}><Coffee /> {t("nav.menu")}</Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
