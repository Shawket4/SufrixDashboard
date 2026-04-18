import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis,
} from "recharts";
import {
  BarChart2, Coffee, DollarSign, Package, Receipt, ShoppingBag,
  TrendingDown, TrendingUp, Users,
} from "lucide-react";
import { PageShell } from "@/shared/ui/page-shell";
import { DataTable } from "@/shared/ui/data-table";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { StatCard } from "@/shared/ui/stat-card";
import { DateRangePicker } from "@/shared/ui/date-range-picker";
import { Badge } from "@/shared/ui/badge";
import { ChartTooltip } from "@/shared/ui/chart-tooltip";
import {
  useBranchSales, useBranchTimeseries, useBranchTellers, useBranchAddons,
  useBranchStockReport, useOrgComparison,
} from "@/entities/report/queries";
import { useBranches } from "@/entities/branch/queries";
import { PAYMENT_COLORS, PAYMENT_METHODS } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import {
  fmtMoney, fmtNumber, fmtPercent, fmtPeriod,
} from "@/shared/lib/format";
import { exportToExcel, talabatTotal } from "@/shared/lib/excel";
import type {
  AddonSalesRow, BranchComparison, ItemSales, StockRow, TellerStats, TimeseriesPoint,
} from "@/shared/types";

type Granularity = "hourly" | "daily" | "monthly";
type TabKey = "overview" | "revenue" | "items" | "tellers" | "branches" | "inventory";

// ─────────────────────────────────────────────────────────────────────────────
// Chart card — thin wrapper with the "rounded-2xl border p-5" treatment
// from the original design.
// ─────────────────────────────────────────────────────────────────────────────
function ChartCard({
  title, children, onExport,
}: {
  title: string;
  children: React.ReactNode;
  onExport?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold">{title}</p>
        {onExport && (
          <Button variant="ghost" size="sm" onClick={onExport}>
            {t("common.export")}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loader — 4 skeleton rows (same shape as the original)
// ─────────────────────────────────────────────────────────────────────────────
const Loader = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-14 rounded-xl" />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Gradient defs for payment-method area fills. Must be unique per mount so
// two charts on the same page don't collide.
// ─────────────────────────────────────────────────────────────────────────────
const PAYMENT_GRADIENTS = ["cash", "card", "talabat_online", "talabat_cash"] as const;

function PaymentGradientDefs() {
  return (
    <defs>
      {PAYMENT_GRADIENTS.map((m) => (
        <linearGradient key={m} id={`grad-${m}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={PAYMENT_COLORS[m]} stopOpacity={0.3} />
          <stop offset="95%" stopColor={PAYMENT_COLORS[m]} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({
  branchId, from, to,
}: {
  branchId: string;
  from: string | null;
  to: string | null;
}) {
  const { t } = useTranslation();
  const params = { from, to };
  const { data: sales, isLoading } = useBranchSales(branchId, params);

  const paymentPie = useMemo(() => {
    if (!sales) return [];
    return PAYMENT_METHODS.map((pm) => ({
      name: t(`payments.${pm}`),
      value:
        pm === "cash" ? sales.cash_revenue :
        pm === "card" ? sales.card_revenue :
        pm === "digital_wallet" ? sales.digital_wallet_revenue :
        pm === "mixed" ? sales.mixed_revenue :
        pm === "talabat_online" ? sales.talabat_online_revenue :
        pm === "talabat_cash" ? sales.talabat_cash_revenue : 0,
      color: PAYMENT_COLORS[pm],
    })).filter((d) => d.value > 0);
  }, [sales, t]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }
  if (!sales) return <EmptyState icon={BarChart2} title={t("analytics.noData")} />;

  const aov = sales.total_orders > 0 ? sales.total_revenue / sales.total_orders : 0;
  const voidDenominator = sales.total_orders + sales.voided_orders;
  const voidRate = voidDenominator > 0 ? sales.voided_orders / voidDenominator : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("orders.totalRevenue")} value={fmtMoney(sales.total_revenue)} icon={Receipt} accent="success" />
        <StatCard label={t("orders.completed")} value={sales.total_orders} icon={ShoppingBag} accent="info" />
        <StatCard label={t("analytics.avgOrder")} value={fmtMoney(aov)} icon={TrendingUp} accent="violet" />
        <StatCard label={t("analytics.voidRate")} value={fmtPercent(voidRate)} icon={TrendingDown} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment method donut — innerRadius={48} matches original */}
        <ChartCard title={t("analytics.revenueByPayment")}>
          {paymentPie.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">{t("analytics.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={paymentPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={48}
                >
                  {paymentPie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <ReTooltip formatter={(v: number) => fmtMoney(v)} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top 5 items — progress bars with brand-gradient fill */}
        <ChartCard title={t("analytics.topItems")}>
          {sales.top_items.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">{t("analytics.noData")}</p>
          ) : (
            <div className="space-y-3">
              {sales.top_items.slice(0, 5).map((item, i) => {
                const share = sales.total_revenue > 0
                  ? (item.revenue / sales.total_revenue) * 100
                  : 0;
                return (
                  <div key={item.menu_item_id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-4 flex-shrink-0">#{i + 1}</span>
                        <span className="text-sm font-medium truncate">{item.item_name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{item.quantity_sold}x</span>
                        <span className="text-sm font-bold tabular">{fmtMoney(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full brand-gradient rounded-full"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Revenue Tab — the centerpiece chart (unstacked areas with gradient fills)
// ─────────────────────────────────────────────────────────────────────────────
function RevenueTab({
  branchId, from, to, granularity,
}: {
  branchId: string;
  from: string | null;
  to: string | null;
  granularity: Granularity;
}) {
  const { t } = useTranslation();
  const params = { from, to, granularity };
  const { data: ts = [], isLoading } = useBranchTimeseries(branchId, params);
  const { data: sales } = useBranchSales(branchId, { from, to });

  const chartData = useMemo(
    () => ts.map((p) => ({
      ...p,
      period: fmtPeriod(p.period, granularity),
    })),
    [ts, granularity],
  );

  const hasDiscounts = chartData.some((p) => p.discount > 0);

  const handleExport = () =>
    exportToExcel({
      filename: `Revenue-${granularity}`,
      sheets: [{
        name: "Timeseries",
        title: `${t("analytics.revenueOverTime")} (${t(`analytics.granularity.${granularity}`)})`,
        columns: [
          { key: "period", header: t("common.time"), accessor: (p: TimeseriesPoint) => fmtPeriod(p.period, granularity), width: 22 },
          { key: "orders", header: t("dashboard.orders"), accessor: (p: TimeseriesPoint) => p.orders, type: "integer", width: 12, total: true },
          { key: "revenue", header: t("orders.totalRevenue"), accessor: (p: TimeseriesPoint) => p.revenue, type: "money", width: 16, total: true },
          { key: "voided", header: t("orderStatus.voided"), accessor: (p: TimeseriesPoint) => p.voided, type: "integer", width: 12, total: true },
          { key: "cash", header: t("payments.cash"), accessor: (p: TimeseriesPoint) => p.cash_revenue, type: "money", width: 14, total: true },
          { key: "card", header: t("payments.card"), accessor: (p: TimeseriesPoint) => p.card_revenue, type: "money", width: 14, total: true },
          { key: "tOn", header: t("payments.talabat_online"), accessor: (p: TimeseriesPoint) => p.talabat_online_revenue, type: "money", width: 14, total: true },
          { key: "tCash", header: t("payments.talabat_cash"), accessor: (p: TimeseriesPoint) => p.talabat_cash_revenue, type: "money", width: 14, total: true },
          { key: "tTot", header: t("payments.talabat_total"), accessor: (p: TimeseriesPoint) => talabatTotal(p), type: "moneyRaw", width: 14, total: true },
        ],
        rows: ts,
        totals: true,
      }],
    });

  if (isLoading) return <Skeleton className="h-72 rounded-2xl" />;
  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border p-12 text-center text-muted-foreground text-sm">
        {t("analytics.noData")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sales && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label={t("orders.totalRevenue")} value={fmtMoney(sales.total_revenue)} accent="success" />
          <StatCard label={t("orders.totalDiscounts")} value={fmtMoney(sales.total_discount)} accent="warning" />
          <StatCard label={t("orders.tax")} value={fmtMoney(sales.total_tax)} accent="info" />
          <StatCard label={t("orders.totalRevenue") + " (net)"} value={fmtMoney(sales.subtotal)} accent="violet" />
        </div>
      )}

      {/* Revenue area chart — unstacked multi-line with gradient fills */}
      <ChartCard title={t("analytics.revenueOverTime")} onExport={handleExport}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <PaymentGradientDefs />
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
            <ReTooltip content={<ChartTooltip valueFormat="money" />} />
            <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
            <Area
              type="monotone"
              dataKey="cash_revenue"
              name={t("payments.cash")}
              stroke={PAYMENT_COLORS.cash}
              fill="url(#grad-cash)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="card_revenue"
              name={t("payments.card")}
              stroke={PAYMENT_COLORS.card}
              fill="url(#grad-card)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="talabat_online_revenue"
              name={t("payments.talabat_online")}
              stroke={PAYMENT_COLORS.talabat_online}
              fill="url(#grad-talabat_online)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="talabat_cash_revenue"
              name={t("payments.talabat_cash")}
              stroke={PAYMENT_COLORS.talabat_cash}
              fill="url(#grad-talabat_cash)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Orders bar chart with rounded corners */}
      <ChartCard title={t("analytics.ordersOverTime")}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <ReTooltip content={<ChartTooltip valueFormat="number" />} />
            <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
            <Bar dataKey="orders" name={t("dashboard.orders")} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="voided" name={t("orderStatus.voided")} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Discount bar chart — only if any period has a discount */}
      {hasDiscounts && (
        <ChartCard title={t("analytics.discountsOverTime")}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
              <ReTooltip content={<ChartTooltip valueFormat="money" />} />
              <Bar dataKey="discount" name={t("orders.discount")} fill="hsl(38 80% 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Items Tab — DataTable + category progress bars + addon sales list
// ─────────────────────────────────────────────────────────────────────────────
function ItemsTab({
  branchId, from, to,
}: {
  branchId: string;
  from: string | null;
  to: string | null;
}) {
  const { t } = useTranslation();
  const params = { from, to };
  const { data: sales, isLoading } = useBranchSales(branchId, params);
  const { data: addons = [] } = useBranchAddons(branchId, params);

  const itemCols: ColumnDef<ItemSales>[] = [
    { accessorKey: "item_name", header: t("common.name"),
      cell: ({ row }) => <span className="font-semibold text-sm">{row.original.item_name}</span> },
    { accessorKey: "quantity_sold", header: t("common.qty"),
      cell: ({ row }) => <span className="tabular text-sm">{fmtNumber(row.original.quantity_sold)}</span> },
    { accessorKey: "revenue", header: t("orders.totalRevenue"),
      cell: ({ row }) => <span className="tabular font-semibold text-sm">{fmtMoney(row.original.revenue)}</span> },
    { id: "share", header: t("analytics.share"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular">
          {sales && sales.total_revenue > 0
            ? fmtPercent(row.original.revenue / sales.total_revenue)
            : "—"}
        </span>
      ) },
  ];

  const exportItems = () => {
    if (!sales) return;
    exportToExcel({
      filename: "Items",
      sheets: [
        {
          name: "Items",
          title: t("analytics.topItemsRev"),
          columns: [
            { key: "name", header: t("common.name"), accessor: (i: ItemSales) => i.item_name, width: 30 },
            { key: "qty", header: t("common.qty"), accessor: (i: ItemSales) => i.quantity_sold, type: "integer", width: 12, total: true },
            { key: "rev", header: t("orders.totalRevenue"), accessor: (i: ItemSales) => i.revenue, type: "money", width: 16, total: true },
          ],
          rows: sales.top_items,
          totals: true,
        },
        {
          name: "Addons",
          title: t("analytics.addonSales"),
          columns: [
            { key: "name", header: t("common.name"), accessor: (a: AddonSalesRow) => a.addon_name, width: 28 },
            { key: "type", header: t("common.type"), accessor: (a: AddonSalesRow) => t(`menu.addonTypes.${a.addon_type}`, { defaultValue: a.addon_type }), width: 16 },
            { key: "qty", header: t("common.qty"), accessor: (a: AddonSalesRow) => a.quantity_sold, type: "integer", width: 12, total: true },
            { key: "rev", header: t("orders.totalRevenue"), accessor: (a: AddonSalesRow) => a.revenue, type: "money", width: 16, total: true },
          ],
          rows: addons,
          totals: true,
        },
      ],
    });
  };

  if (isLoading) return <Loader />;
  if (!sales) return <EmptyState icon={Coffee} title={t("analytics.noData")} />;

  return (
    <div className="space-y-4">
      <ChartCard title={t("analytics.topItemsRev")} onExport={exportItems}>
        <DataTable columns={itemCols} data={sales.top_items} searchKey="item_name" pageSize={10} />
      </ChartCard>

      {/* Category progress bars with brand-gradient fill */}
      <ChartCard title={t("analytics.byCategory")}>
        <div className="space-y-3">
          {sales.by_category.map((cat) => {
            const share = sales.total_revenue > 0
              ? (cat.revenue / sales.total_revenue) * 100
              : 0;
            return (
              <div key={cat.category_id ?? "uncategorised"}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">
                    {cat.category_name ?? t("menu.uncategorised")}
                  </span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {cat.quantity_sold} {t("analytics.sold")}
                    </span>
                    <span className="font-bold tabular text-sm">{fmtMoney(cat.revenue)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full brand-gradient rounded-full"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* Addon sales list — flat row with type badge, exactly as original */}
      {addons.length > 0 && (
        <ChartCard title={t("analytics.addonSales")}>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {addons.slice(0, 15).map((a) => (
              <div
                key={a.addon_item_id}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{a.addon_name}</span>
                  <Badge variant="info" className="text-[10px]">
                    {t(`menu.addonTypes.${a.addon_type}`, { defaultValue: a.addon_type })}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{a.quantity_sold}x</span>
                  <span className="font-semibold tabular text-sm">{fmtMoney(a.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tellers Tab — horizontal bar + DataTable
// ─────────────────────────────────────────────────────────────────────────────
function TellersTab({
  branchId, from, to,
}: {
  branchId: string;
  from: string | null;
  to: string | null;
}) {
  const { t } = useTranslation();
  const params = { from, to };
  const { data: tellers = [], isLoading } = useBranchTellers(branchId, params);

  const cols: ColumnDef<TellerStats>[] = [
    { accessorKey: "teller_name", header: t("common.name"),
      cell: ({ row }) => <span className="font-semibold text-sm">{row.original.teller_name}</span> },
    { accessorKey: "orders", header: t("dashboard.orders"),
      cell: ({ row }) => <span className="tabular">{row.original.orders}</span> },
    { accessorKey: "voided", header: t("orderStatus.voided"),
      cell: ({ row }) => (
        <span className={row.original.voided > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
          {row.original.voided}
        </span>
      ) },
    { accessorKey: "shifts", header: t("nav.shifts"),
      cell: ({ row }) => <span className="tabular">{row.original.shifts}</span> },
    { accessorKey: "avg_order_value", header: t("analytics.aov"),
      cell: ({ row }) => <span className="tabular">{fmtMoney(row.original.avg_order_value)}</span> },
    { accessorKey: "revenue", header: t("orders.totalRevenue"),
      cell: ({ row }) => <span className="tabular font-semibold">{fmtMoney(row.original.revenue)}</span> },
  ];

  const handleExport = () =>
    exportToExcel({
      filename: "Tellers",
      sheets: [{
        name: "Tellers",
        title: t("analytics.revenueByTeller"),
        columns: [
          { key: "name", header: t("common.name"), accessor: (tl: TellerStats) => tl.teller_name, width: 24 },
          { key: "orders", header: t("dashboard.orders"), accessor: (tl: TellerStats) => tl.orders, type: "integer", width: 12, total: true },
          { key: "voided", header: t("orderStatus.voided"), accessor: (tl: TellerStats) => tl.voided, type: "integer", width: 12, total: true },
          { key: "shifts", header: t("nav.shifts"), accessor: (tl: TellerStats) => tl.shifts, type: "integer", width: 12, total: true },
          { key: "aov", header: t("analytics.aov"), accessor: (tl: TellerStats) => tl.avg_order_value, type: "money", width: 14 },
          { key: "revenue", header: t("orders.totalRevenue"), accessor: (tl: TellerStats) => tl.revenue, type: "money", width: 16, total: true },
        ],
        rows: tellers,
        totals: true,
      }],
    });

  if (isLoading) return <Loader />;
  if (tellers.length === 0) return <EmptyState icon={Users} title={t("analytics.noData")} />;

  return (
    <div className="space-y-4">
      <ChartCard title={t("analytics.revenueByTeller")}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={tellers.slice(0, 8)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="teller_name" tick={{ fontSize: 11 }} width={90} />
            <ReTooltip content={<ChartTooltip valueFormat="money" />} />
            <Bar dataKey="revenue" name={t("orders.totalRevenue")} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DataTable columns={cols} data={tellers} searchKey="teller_name" onExport={handleExport} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Branches Tab — stacked payment bars (Talabat still split) + table
// ─────────────────────────────────────────────────────────────────────────────
function BranchesTab({
  orgId, from, to,
}: {
  orgId: string;
  from: string | null;
  to: string | null;
}) {
  const { t } = useTranslation();
  const { data: report, isLoading } = useOrgComparison(orgId, { from, to });

  const cols: ColumnDef<BranchComparison>[] = [
    { accessorKey: "branch_name", header: t("common.name"),
      cell: ({ row }) => <span className="font-semibold text-sm">{row.original.branch_name}</span> },
    { accessorKey: "total_orders", header: t("dashboard.orders"),
      cell: ({ row }) => <span className="tabular">{row.original.total_orders}</span> },
    { accessorKey: "voided_orders", header: t("orderStatus.voided"),
      cell: ({ row }) => (
        <span className={row.original.voided_orders > 0 ? "text-destructive" : "text-muted-foreground"}>
          {row.original.voided_orders}
        </span>
      ) },
    { accessorKey: "avg_order_value", header: t("analytics.aov"),
      cell: ({ row }) => <span className="tabular text-xs">{fmtMoney(row.original.avg_order_value)}</span> },
    { accessorKey: "cash_revenue", header: t("payments.cash"),
      cell: ({ row }) => <span className="tabular text-xs">{fmtMoney(row.original.cash_revenue)}</span> },
    { accessorKey: "card_revenue", header: t("payments.card"),
      cell: ({ row }) => <span className="tabular text-xs">{fmtMoney(row.original.card_revenue)}</span> },
    { id: "talabat_total", header: t("payments.talabat_total"),
      cell: ({ row }) => <span className="tabular text-xs">{fmtMoney(talabatTotal(row.original))}</span> },
    { accessorKey: "total_revenue", header: t("orders.totalRevenue"),
      cell: ({ row }) => <span className="tabular font-semibold text-sm">{fmtMoney(row.original.total_revenue)}</span> },
    { accessorKey: "void_rate_pct", header: t("analytics.voidRate"),
      cell: ({ row }) => (
        <span className={`tabular text-xs ${row.original.void_rate_pct > 5 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
          {row.original.void_rate_pct.toFixed(1)}%
        </span>
      ) },
  ];

  const handleExport = () => {
    if (!report) return;
    exportToExcel({
      filename: "Branch-Comparison",
      sheets: [{
        name: "Branches",
        title: t("analytics.revenueByBranch"),
        columns: [
          { key: "name", header: t("common.name"), accessor: (b: BranchComparison) => b.branch_name, width: 24 },
          { key: "orders", header: t("dashboard.orders"), accessor: (b: BranchComparison) => b.total_orders, type: "integer", width: 12, total: true },
          { key: "voided", header: t("orderStatus.voided"), accessor: (b: BranchComparison) => b.voided_orders, type: "integer", width: 12, total: true },
          { key: "aov", header: t("analytics.aov"), accessor: (b: BranchComparison) => b.avg_order_value, type: "money", width: 14 },
          { key: "cash", header: t("payments.cash"), accessor: (b: BranchComparison) => b.cash_revenue, type: "money", width: 14, total: true },
          { key: "card", header: t("payments.card"), accessor: (b: BranchComparison) => b.card_revenue, type: "money", width: 14, total: true },
          { key: "dw", header: t("payments.digital_wallet"), accessor: (b: BranchComparison) => b.digital_wallet_revenue, type: "money", width: 14, total: true },
          { key: "tOn", header: t("payments.talabat_online"), accessor: (b: BranchComparison) => b.talabat_online_revenue, type: "money", width: 14, total: true },
          { key: "tCash", header: t("payments.talabat_cash"), accessor: (b: BranchComparison) => b.talabat_cash_revenue, type: "money", width: 14, total: true },
          { key: "tTot", header: t("payments.talabat_total"), accessor: (b: BranchComparison) => talabatTotal(b), type: "moneyRaw", width: 14, total: true },
          { key: "rev", header: t("orders.totalRevenue"), accessor: (b: BranchComparison) => b.total_revenue, type: "money", width: 16, total: true },
        ],
        rows: report.branches,
        totals: true,
      }],
    });
  };

  if (isLoading) return <Loader />;
  if (!report || report.branches.length === 0) return <EmptyState icon={BarChart2} title={t("analytics.noData")} />;

  return (
    <div className="space-y-4">
      <ChartCard title={t("analytics.revenueByBranch")} onExport={handleExport}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={report.branches}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="branch_name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
            <ReTooltip content={<ChartTooltip valueFormat="money" />} />
            <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
            <Bar dataKey="cash_revenue" name={t("payments.cash")} stackId="a" fill={PAYMENT_COLORS.cash} />
            <Bar dataKey="card_revenue" name={t("payments.card")} stackId="a" fill={PAYMENT_COLORS.card} />
            <Bar dataKey="digital_wallet_revenue" name={t("payments.digital_wallet")} stackId="a" fill={PAYMENT_COLORS.digital_wallet} />
            <Bar dataKey="talabat_online_revenue" name={t("payments.talabat_online")} stackId="a" fill={PAYMENT_COLORS.talabat_online} />
            <Bar dataKey="talabat_cash_revenue" name={t("payments.talabat_cash")} stackId="a" fill={PAYMENT_COLORS.talabat_cash} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DataTable columns={cols} data={report.branches} searchKey="branch_name" onExport={handleExport} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory Tab — stock list with coloured progress bars
// ─────────────────────────────────────────────────────────────────────────────
function InventoryTab({ branchId }: { branchId: string }) {
  const { t } = useTranslation();
  const { data: report, isLoading } = useBranchStockReport(branchId);

  const handleExport = () => {
    if (!report) return;
    exportToExcel({
      filename: "Stock-Levels",
      sheets: [{
        name: "Stock",
        title: t("analytics.stockLevels"),
        columns: [
          { key: "name", header: t("recipes.ingredient"), accessor: (s: StockRow) => s.ingredient_name, width: 28 },
          { key: "unit", header: "Unit", accessor: (s: StockRow) => s.unit, width: 10 },
          { key: "stock", header: t("inventory.stock.currentStock"), accessor: (s: StockRow) => Number(s.current_stock), type: "number", width: 14 },
          { key: "threshold", header: t("inventory.stock.reorderAt"), accessor: (s: StockRow) => Number(s.reorder_threshold), type: "number", width: 14 },
          { key: "low", header: t("common.status"), accessor: (s: StockRow) => (s.below_reorder ? t("inventory.stock.low") : t("inventory.stock.ok")), width: 12 },
        ],
        rows: report.items,
      }],
    });
  };

  if (isLoading) return <Loader />;
  if (!report || report.items.length === 0) return <EmptyState icon={Package} title={t("analytics.noData")} />;

  const lowCount = report.items.filter((i) => i.below_reorder).length;

  // Sort: low-stock items first so they're easy to spot
  const sorted = [...report.items].sort(
    (a, b) => Number(b.below_reorder) - Number(a.below_reorder),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("inventory.catalog.title")} value={report.items.length} icon={Package} />
        <StatCard label={t("dashboard.lowStock")} value={lowCount} icon={DollarSign} accent="warning" />
        <StatCard label={t("inventory.stock.ok")} value={report.items.length - lowCount} accent="success" />
        <StatCard label={t("analytics.lowRatio")} value={report.items.length > 0 ? fmtPercent(lowCount / report.items.length) : "0%"} />
      </div>

      <ChartCard title={t("analytics.stockLevels")} onExport={handleExport}>
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
          {sorted.map((item) => {
            const pctVal = item.reorder_threshold > 0
              ? Math.min(100, (Number(item.current_stock) / Math.max(Number(item.reorder_threshold) * 2, 1)) * 100)
              : 100;
            return (
              <div key={item.branch_inventory_id} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{item.ingredient_name}</span>
                    {item.below_reorder && (
                      <Badge variant="warning" className="text-[10px] h-4">
                        {t("inventory.stock.low")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.below_reorder ? "bg-amber-500" : "brand-gradient"}`}
                        style={{ width: `${pctVal}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular">
                      {Number(item.current_stock).toFixed(2)} / {Number(item.reorder_threshold).toFixed(2)} {item.unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { t } = useTranslation();
  const { orgId, isSuperAdmin, isOrgAdmin, branchId: ctxBranch } = useCurrentContext();
  const { data: branches = [] } = useBranches(orgId);
  const [selBranch, setSelBranch] = useState<string>(ctxBranch ?? "");
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [gran, setGran] = useState<Granularity>("daily");
  const [tab, setTab] = useState<TabKey>("overview");

  useMemo(() => {
    if (!selBranch && branches.length > 0) setSelBranch(branches[0].id);
  }, [branches, selBranch]);

  const canCompareBranches = (isSuperAdmin || isOrgAdmin) && branches.length > 1;

  if (!orgId) {
    return <PageShell title={t("analytics.title")} description={t("analytics.subtitle")}>{null}</PageShell>;
  }

  return (
    <PageShell
      title={t("analytics.title")}
      description={branches.find((b) => b.id === selBranch)?.name ?? t("analytics.subtitle")}
      action={
        branches.length > 1 && (
          <Select value={selBranch} onValueChange={setSelBranch}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )
      }
    >
      {/* Date range — above tabs, matches original layout */}
      <DateRangePicker from={from} to={to} onChange={(f, tt) => { setFrom(f); setTo(tt); }} />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">
            <BarChart2 size={13} /> {t("analytics.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <TrendingUp size={13} /> {t("analytics.tabs.revenue")}
          </TabsTrigger>
          <TabsTrigger value="items">
            <Coffee size={13} /> {t("analytics.tabs.items")}
          </TabsTrigger>
          <TabsTrigger value="tellers">
            <Users size={13} /> {t("analytics.tabs.tellers")}
          </TabsTrigger>
          {canCompareBranches && (
            <TabsTrigger value="branches">
              <BarChart2 size={13} /> {t("analytics.tabs.branches")}
            </TabsTrigger>
          )}
          <TabsTrigger value="inventory">
            <Package size={13} /> {t("analytics.tabs.inventory")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {selBranch
            ? <OverviewTab branchId={selBranch} from={from} to={to} />
            : <EmptyState icon={BarChart2} title={t("orders.selectBranch")} />}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {/* Granularity toggle — individual buttons, original style */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["hourly", "daily", "monthly"] as const).map((g) => (
              <Button
                key={g}
                variant={gran === g ? "default" : "outline"}
                size="sm"
                onClick={() => setGran(g)}
              >
                {t(`analytics.granularity.${g}`)}
              </Button>
            ))}
          </div>
          {selBranch
            ? <RevenueTab branchId={selBranch} from={from} to={to} granularity={gran} />
            : <EmptyState icon={BarChart2} title={t("orders.selectBranch")} />}
        </TabsContent>

        <TabsContent value="items">
          {selBranch
            ? <ItemsTab branchId={selBranch} from={from} to={to} />
            : <EmptyState icon={Coffee} title={t("orders.selectBranch")} />}
        </TabsContent>

        <TabsContent value="tellers">
          {selBranch
            ? <TellersTab branchId={selBranch} from={from} to={to} />
            : <EmptyState icon={Users} title={t("orders.selectBranch")} />}
        </TabsContent>

        {canCompareBranches && (
          <TabsContent value="branches">
            <BranchesTab orgId={orgId} from={from} to={to} />
          </TabsContent>
        )}

        <TabsContent value="inventory">
          {selBranch
            ? <InventoryTab branchId={selBranch} />
            : <EmptyState icon={Package} title={t("orders.selectBranch")} />}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
