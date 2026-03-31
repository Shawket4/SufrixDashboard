import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart2, TrendingUp, Users, Package, Coffee,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import * as reportsApi from "@/api/reports";
import * as branchesApi from "@/api/branches";
import { egp, fmtPayment } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";

// ── Colour palette (matches PAYMENT_COLORS in utils/format if it exists) ─────
const COLORS: Record<string, string> = {
  cash:            "#059669",
  card:            "#7C3AED",
  digital_wallet:  "#0EA5E9",
  mixed:           "#F59E0B",
  talabat_online:  "#FF6B00",
  talabat_cash:    "#FF9A3C",
};

const CHART_COLORS = [
  "#7C3AED", "#059669", "#0EA5E9", "#F59E0B",
  "#EF4444", "#EC4899", "#14B8A6", "#F97316",
];

// ── Tooltip ───────────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl shadow-xl p-3 text-sm min-w-[140px]">
      <p className="text-xs text-muted-foreground font-medium mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-xs">{p.name}</span>
          </span>
          <span className="font-bold text-xs tabular-nums">
            {typeof p.value === "number" && p.value > 100
              ? egp(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({
  title, value, sub, color = "text-primary",
}: {
  title: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className={`text-2xl font-extrabold tabular-nums ${color}`}>{value}</p>
      <p className="text-sm font-medium mt-1">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Loader skeleton ───────────────────────────────────────────────────────────
function Loader() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

// ── Granularity options ───────────────────────────────────────────────────────
const GRANULARITIES = [
  { value: "hourly",  label: "Hourly"  },
  { value: "daily",   label: "Daily"   },
  { value: "monthly", label: "Monthly" },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function Analytics() {
  const user     = useAuthStore((s) => s.user);
  const orgId    = useAppStore((s) => s.selectedOrgId) ?? user?.org_id ?? "";
  const branchId = useAppStore((s) => s.selectedBranchId) ?? "";

  const [tab,         setTab]         = useState("overview");
  const [selBranch,   setSelBranch]   = useState(branchId);
  const [from,        setFrom]        = useState("");
  const [to,          setTo]          = useState("");
  const [granularity, setGranularity] = useState("daily");

  // ── Branch list ─────────────────────────────────────────────────────────────
  const { data: branches = [] } = useQuery({
    queryKey: ["branches", orgId],
    queryFn:  () => branchesApi.getBranches(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });

  React.useEffect(() => {
    if (branches.length > 0 && !selBranch) setSelBranch(branches[0].id);
  }, [branches, selBranch]);

  const activeBranch = branches.find((b) => b.id === selBranch) ?? branches[0];
  const bid = activeBranch?.id;

  const params = {
    from: from || undefined,
    to:   to   || undefined,
  };

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ["branch-sales", bid, from, to],
    queryFn:  () => reportsApi.getBranchSales(bid!, params).then((r) => r.data),
    enabled:  !!bid,
  });

  const { data: timeseries = [], isLoading: tsLoading } = useQuery({
    queryKey: ["timeseries", bid, from, to, granularity],
    queryFn:  () =>
      reportsApi.getBranchTimeseries(bid!, { ...params, granularity }).then((r) => r.data),
    enabled:  !!bid && tab === "revenue",
  });

  const { data: tellers = [], isLoading: tellersLoading } = useQuery({
    queryKey: ["tellers", bid, from, to],
    queryFn:  () => reportsApi.getBranchTellers(bid!, params).then((r) => r.data),
    enabled:  !!bid && tab === "tellers",
  });

  const { data: addons = [] } = useQuery({
    queryKey: ["addons", bid, from, to],
    queryFn:  () => reportsApi.getBranchAddonSales(bid!, params).then((r) => r.data),
    enabled:  !!bid && (tab === "items" || tab === "overview"),
  });

  const { data: comparison } = useQuery({
    queryKey: ["org-comparison", orgId, from, to],
    queryFn:  () => reportsApi.getOrgComparison(orgId, params).then((r) => r.data),
    enabled:  !!orgId && tab === "branches",
  });

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ["branch-stock", bid],
    queryFn:  () => reportsApi.getBranchStock(bid!).then((r) => r.data),
    enabled:  !!bid && tab === "inventory",
  });

  // ── Payment pie data ────────────────────────────────────────────────────────
  const paymentPie = sales
    ? [
        { name: "Cash",           value: sales.cash_revenue,           key: "cash"           },
        { name: "Card",           value: sales.card_revenue,           key: "card"           },
        { name: "Digital Wallet", value: sales.digital_wallet_revenue, key: "digital_wallet" },
        { name: "Mixed",          value: sales.mixed_revenue,          key: "mixed"          },
        { name: "Talabat Online", value: sales.talabat_online_revenue, key: "talabat_online" },
        { name: "Talabat Cash",   value: sales.talabat_cash_revenue,   key: "talabat_cash"   },
      ].filter((d) => d.value > 0)
    : [];

  // ── Timeseries: format period label for display ─────────────────────────────
  const tsFormatted = timeseries.map((p: any) => {
    let label = p.period as string;
    try {
      const d = new Date(p.period);
      if (granularity === "hourly")  label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (granularity === "daily")   label = d.toLocaleDateString([], { day: "2-digit", month: "short" });
      if (granularity === "monthly") label = d.toLocaleDateString([], { month: "short", year: "2-digit" });
    } catch (_) {}
    return { ...p, label };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Analytics"
        sub={activeBranch ? activeBranch.name : "Select a branch"}
        actions={
          branches.length > 1 ? (
            <Select value={selBranch} onValueChange={setSelBranch}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Branch…" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {/* Date range */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>
            Clear dates
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">  <BarChart2 size={13} /> Overview  </TabsTrigger>
          <TabsTrigger value="revenue">   <TrendingUp size={13}/> Revenue   </TabsTrigger>
          <TabsTrigger value="items">     <Coffee size={13}/>     Items     </TabsTrigger>
          <TabsTrigger value="tellers">   <Users size={13}/>      Tellers   </TabsTrigger>
          <TabsTrigger value="branches">  <BarChart2 size={13}/> Branches  </TabsTrigger>
          <TabsTrigger value="inventory"> <Package size={13}/>    Inventory </TabsTrigger>
        </TabsList>

        {/* ── Overview ───────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {salesLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
          ) : sales ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Revenue"
                  value={egp(sales.total_revenue)}
                  sub={`${sales.total_orders} orders`}
                />
                <StatCard
                  title="Total Discounts"
                  value={egp(sales.total_discount)}
                  sub="Applied this period"
                  color="text-amber-600"
                />
                <StatCard
                  title="Tax Collected"
                  value={egp(sales.total_tax)}
                  color="text-violet-600"
                />
                <StatCard
                  title="Voided Orders"
                  value={sales.voided_orders}
                  sub={
                    sales.total_orders + sales.voided_orders > 0
                      ? `${((sales.voided_orders / (sales.total_orders + sales.voided_orders)) * 100).toFixed(1)}% void rate`
                      : "—"
                  }
                  color={sales.voided_orders > 0 ? "text-destructive" : "text-muted-foreground"}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Payment breakdown pie */}
                <div className="rounded-2xl border bg-card p-5">
                  <p className="text-sm font-bold mb-4">Revenue by Payment Method</p>
                  {paymentPie.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-10">No payment data</p>
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
                          innerRadius={50}
                        >
                          {paymentPie.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={COLORS[entry.key] ?? CHART_COLORS[i % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => egp(v)} />
                        <Legend
                          formatter={(v) => <span className="text-xs">{v}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Top 5 items */}
                <div className="rounded-2xl border bg-card p-5">
                  <p className="text-sm font-bold mb-4">Top Items</p>
                  {sales.top_items.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-10">No items</p>
                  ) : (
                    <div className="space-y-3">
                      {sales.top_items.slice(0, 5).map((item: any, i: number) => {
                        const share = sales.total_revenue > 0
                          ? (item.revenue / sales.total_revenue) * 100
                          : 0;
                        return (
                          <div key={item.menu_item_id ?? i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                                <span className="text-sm font-medium">{item.item_name}</span>
                              </span>
                              <span className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">{item.quantity_sold}x</span>
                                <span className="text-sm font-bold tabular-nums">{egp(item.revenue)}</span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${Math.min(100, share)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* ── Revenue timeseries ──────────────────────────────────────────────── */}
        <TabsContent value="revenue" className="space-y-4">
          {/* Granularity toggle */}
          <div className="flex items-center gap-2">
            {GRANULARITIES.map((g) => (
              <Button
                key={g.value}
                variant={granularity === g.value ? "default" : "outline"}
                size="sm"
                onClick={() => setGranularity(g.value)}
              >
                {g.label}
              </Button>
            ))}
          </div>

          {tsLoading ? (
            <Skeleton className="h-72 rounded-2xl" />
          ) : tsFormatted.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground text-sm">
              No data for this period
            </div>
          ) : (
            <>
              {/* Revenue area chart — broken out by payment method */}
              <div className="rounded-2xl border bg-card p-5">
                <p className="text-sm font-bold mb-4">Revenue Over Time</p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={tsFormatted}>
                    <defs>
                      {Object.entries(COLORS).map(([key, color]) => (
                        <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={color} stopOpacity={0}    />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 100)}`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Legend formatter={(v) => <span className="text-xs">{fmtPayment(v.replace("_revenue",""))}</span>} />
                    <Area type="monotone" dataKey="cash_revenue"           name="cash"           stroke={COLORS.cash}           fill="url(#grad-cash)"           strokeWidth={2} />
                    <Area type="monotone" dataKey="card_revenue"           name="card"           stroke={COLORS.card}           fill="url(#grad-card)"           strokeWidth={2} />
                    <Area type="monotone" dataKey="talabat_online_revenue" name="talabat_online" stroke={COLORS.talabat_online} fill="url(#grad-talabat_online)" strokeWidth={2} />
                    <Area type="monotone" dataKey="talabat_cash_revenue"   name="talabat_cash"   stroke={COLORS.talabat_cash}   fill="url(#grad-talabat_cash)"   strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Orders + voided bar chart */}
              <div className="rounded-2xl border bg-card p-5">
                <p className="text-sm font-bold mb-4">Orders Over Time</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={tsFormatted}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTip />} />
                    <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                    <Bar dataKey="orders" name="orders" fill="hsl(var(--primary))"     radius={[4,4,0,0]} />
                    <Bar dataKey="voided" name="voided" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Discounts over time (only if any discount data) */}
              {tsFormatted.some((p: any) => (p.discount ?? 0) > 0) && (
                <div className="rounded-2xl border bg-card p-5">
                  <p className="text-sm font-bold mb-4">Discounts Over Time</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={tsFormatted}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${Math.round(v / 100)}`} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="discount" name="discount" fill="#F59E0B" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Items ──────────────────────────────────────────────────────────── */}
        <TabsContent value="items" className="space-y-4">
          {salesLoading ? <Loader /> : sales && (
            <>
              {/* Full top items table */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b bg-muted/30">
                  <p className="text-sm font-bold">Top Items by Revenue</p>
                </div>
                <div className="divide-y divide-border/50">
                  {sales.top_items.map((item: any, i: number) => {
                    const share = sales.total_revenue > 0
                      ? (item.revenue / sales.total_revenue) * 100
                      : 0;
                    return (
                      <div key={item.menu_item_id ?? i} className="px-5 py-3 flex items-center gap-4">
                        <span className="text-sm text-muted-foreground w-6 flex-shrink-0">#{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{item.item_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, share)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{share.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold tabular-nums text-sm">{egp(item.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity_sold} sold</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By category */}
              {sales.by_category.length > 0 && (
                <div className="rounded-2xl border bg-card p-5">
                  <p className="text-sm font-bold mb-4">By Category</p>
                  <div className="space-y-3">
                    {sales.by_category.map((cat: any, i: number) => {
                      const share = sales.total_revenue > 0
                        ? (cat.revenue / sales.total_revenue) * 100
                        : 0;
                      return (
                        <div key={cat.category_id ?? i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {cat.category_name ?? "Uncategorised"}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{cat.quantity_sold} sold</span>
                              <span className="font-bold tabular-nums text-sm">{egp(cat.revenue)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, share)}%`,
                                background: CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Addon sales */}
              {addons.length > 0 && (
                <div className="rounded-2xl border bg-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b bg-muted/30">
                    <p className="text-sm font-bold">Addon Sales</p>
                  </div>
                  <div className="divide-y divide-border/50">
                    {addons.slice(0, 20).map((a: any) => (
                      <div key={a.addon_item_id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{a.addon_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {a.addon_type.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums text-sm">{egp(a.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{a.quantity_sold}x</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Tellers ────────────────────────────────────────────────────────── */}
        <TabsContent value="tellers" className="space-y-4">
          {tellersLoading ? <Loader /> : (
            <>
              {tellers.length > 0 && (
                <div className="rounded-2xl border bg-card p-5">
                  <p className="text-sm font-bold mb-4">Revenue by Teller</p>
                  <ResponsiveContainer width="100%" height={Math.max(180, tellers.length * 40)}>
                    <BarChart data={tellers.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => `${Math.round(v / 100)}`}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="teller_name"
                        tick={{ fontSize: 11 }}
                        width={100}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="revenue" name="revenue" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b bg-muted/30 grid grid-cols-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-2">Teller</span>
                  <span className="text-right">Orders</span>
                  <span className="text-right">Revenue</span>
                  <span className="text-right">Avg Order</span>
                </div>
                <div className="divide-y divide-border/50">
                  {tellers.map((t: any) => (
                    <div key={t.teller_id} className="px-5 py-3 grid grid-cols-5 items-center">
                      <div className="col-span-2">
                        <p className="text-sm font-semibold">{t.teller_name}</p>
                        <p className="text-xs text-muted-foreground">{t.shifts} shift{t.shifts !== 1 ? "s" : ""}</p>
                      </div>
                      <p className="text-sm tabular-nums text-right">{t.orders}</p>
                      <p className="text-sm font-bold tabular-nums text-right">{egp(t.revenue)}</p>
                      <p className="text-sm tabular-nums text-right text-muted-foreground">{egp(t.avg_order_value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Branch comparison ──────────────────────────────────────────────── */}
        <TabsContent value="branches" className="space-y-4">
          {!comparison ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <>
              <div className="rounded-2xl border bg-card p-5">
                <p className="text-sm font-bold mb-4">Revenue by Branch (Stacked)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={comparison.branches}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="branch_name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 100)}`} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTip />} />
                    <Legend formatter={(v) => <span className="text-xs">{fmtPayment(v)}</span>} />
                    <Bar dataKey="cash_revenue"           name="cash"           fill={COLORS.cash}           stackId="a" />
                    <Bar dataKey="card_revenue"           name="card"           fill={COLORS.card}           stackId="a" />
                    <Bar dataKey="talabat_online_revenue" name="talabat_online" fill={COLORS.talabat_online} stackId="a" />
                    <Bar dataKey="talabat_cash_revenue"   name="talabat_cash"   fill={COLORS.talabat_cash}   stackId="a" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b bg-muted/30 grid grid-cols-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-2">Branch</span>
                  <span className="text-right">Orders</span>
                  <span className="text-right">Revenue</span>
                  <span className="text-right">Void %</span>
                </div>
                <div className="divide-y divide-border/50">
                  {comparison.branches.map((b: any) => (
                    <div key={b.branch_id} className="px-5 py-3 grid grid-cols-5 items-center">
                      <p className="col-span-2 text-sm font-semibold">{b.branch_name}</p>
                      <p className="text-sm tabular-nums text-right">{b.total_orders}</p>
                      <p className="text-sm font-bold tabular-nums text-right">{egp(b.total_revenue)}</p>
                      <p className={`text-sm tabular-nums text-right ${b.void_rate_pct > 5 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        {b.void_rate_pct.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Inventory ──────────────────────────────────────────────────────── */}
        <TabsContent value="inventory" className="space-y-4">
          {stockLoading ? <Loader /> : stock && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard title="Total Items"    value={stock.items.length} />
                <StatCard
                  title="Low Stock"
                  value={stock.items.filter((i: any) => i.below_reorder).length}
                  color="text-amber-600"
                />
                <StatCard title="Active"   value={stock.items.filter((i: any) => i.is_active).length} />
                <StatCard
                  title="Inactive"
                  value={stock.items.filter((i: any) => !i.is_active).length}
                  color="text-muted-foreground"
                />
              </div>

              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-5 py-3.5 border-b bg-muted/30">
                  <p className="text-sm font-bold">Stock Levels</p>
                </div>
                <div className="divide-y divide-border/50">
                  {stock.items
                    .sort((a: any, b: any) => Number(b.below_reorder) - Number(a.below_reorder))
                    .map((item: any) => {
                      const pct = Math.min(
                        100,
                        (item.current_stock / Math.max(item.reorder_threshold * 2, 1)) * 100
                      );
                      return (
                        <div key={item.inventory_item_id} className="flex items-center gap-4 px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium">{item.item_name}</p>
                              {item.below_reorder && (
                                <Badge variant="warning" className="text-[10px] h-4">Low</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px]">
                                <div
                                  className={`h-full rounded-full ${item.below_reorder ? "bg-amber-500" : "bg-primary"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {item.current_stock} / {item.reorder_threshold} {item.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
