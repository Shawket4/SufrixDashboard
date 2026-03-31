import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import {
  ShoppingBag,
  ChevronRight,
  XCircle,
  Download,
  Filter,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import * as ordersApi from "@/api/orders";
import * as shiftsApi from "@/api/shifts";
import * as branchesApi from "@/api/branches";
import * as discountsApi from "@/api/discounts";
import { getErrorMessage } from "@/lib/client";
import {
  egp,
  fmtDateTime,
  fmtTime,
  fmtPayment,
  PAYMENT_BG,
  fmtDate,
} from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import type { Order, Shift, Discount } from "@/types";

// ── Payment badge ─────────────────────────────────────────────────────────────
function PaymentBadge({ method }: { method: string }) {
  const bg =
    PAYMENT_BG[method as keyof typeof PAYMENT_BG] ??
    "bg-muted text-muted-foreground";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bg}`}>
      {fmtPayment(method)}
    </span>
  );
}

// ── Order detail drawer ───────────────────────────────────────────────────────
function OrderDetailDrawer({
  order,
  onClose,
  discounts,
}: {
  order: Order;
  onClose: () => void;
  discounts: Discount[];
}) {
  const qc = useQueryClient();
  const isVoided = order.status === "voided";
  const disc = discounts.find((d) => d.id === order.discount_id);
  const [voidReason, setVoidReason] = useState("customer_request");

  const { mutate: doVoid, isPending } = useMutation({
    mutationFn: (reason: string) =>
      ordersApi.voidOrder(order.id, { reason, restore_inventory: true }),
    onSuccess: () => {
      toast.success("Order voided");
      qc.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-lg">Order #{order.order_number}</h2>
            {isVoided && <Badge variant="destructive">Voided</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {fmtDateTime(order.created_at)} · {order.teller_name}
          </p>
        </div>
        <PaymentBadge method={order.payment_method} />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Items */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/40 border-b">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Items
              </p>
            </div>
            <div className="divide-y divide-border/50">
              {(order.items ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No item details
                </p>
              ) : (
                (order.items ?? []).map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          {item.quantity}× {item.item_name}
                          {item.size_label && (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              · {item.size_label}
                            </span>
                          )}
                        </p>
                        {(item.addons ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.addons.map((a) => (
                              <span
                                key={a.id}
                                className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
                              >
                                {a.addon_name}
                                {a.unit_price > 0
                                  ? ` +${egp(a.unit_price)}`
                                  : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold tabular-nums text-sm">
                        {egp(item.line_total)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-xl border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{egp(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  Discount
                  {disc && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {disc.name}
                    </Badge>
                  )}
                  {!disc && order.discount_type && (
                    <span className="text-[10px] text-muted-foreground">
                      (
                      {order.discount_type === "percentage"
                        ? `${order.discount_value}%`
                        : egp(order.discount_value)}
                      )
                    </span>
                  )}
                </span>
                <span className="text-green-600 font-medium tabular-nums">
                  − {egp(order.discount_amount)}
                </span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">{egp(order.tax_amount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span
                className={`tabular-nums ${isVoided ? "line-through text-muted-foreground" : "text-primary"}`}
              >
                {egp(order.total_amount)}
              </span>
            </div>
            {order.amount_tendered != null && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cash Tendered</span>
                  <span className="tabular-nums">
                    {egp(order.amount_tendered)}
                  </span>
                </div>
                {(order.change_given ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Change Given</span>
                    <span className="text-green-600 font-semibold tabular-nums">
                      {egp(order.change_given!)}
                    </span>
                  </div>
                )}
              </>
            )}
            {(order.tip_amount ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tip</span>
                <span className="text-amber-600 font-medium tabular-nums">
                  {egp(order.tip_amount!)}
                </span>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="rounded-xl border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span>{order.customer_name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <PaymentBadge method={order.payment_method} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teller</span>
              <span>{order.teller_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span>{fmtDateTime(order.created_at)}</span>
            </div>
            {isVoided && order.void_reason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Void Reason</span>
                <span className="text-destructive capitalize">
                  {order.void_reason.replace(/_/g, " ")}
                </span>
              </div>
            )}
          </div>

          {/* Void controls */}
          {!isVoided && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                <XCircle size={14} /> Void Order
              </p>
              <Select value={voidReason} onValueChange={setVoidReason}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_request">
                    Customer Request
                  </SelectItem>
                  <SelectItem value="wrong_order">Wrong Order</SelectItem>
                  <SelectItem value="quality_issue">Quality Issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                loading={isPending}
                onClick={() =>
                  confirm("Void this order?") && doVoid(voidReason)
                }
              >
                <XCircle size={13} /> Void Order
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Orders page ──────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  "cash",
  "card",
  "digital_wallet",
  "mixed",
  "talabat_online",
  "talabat_cash",
];

export default function Orders() {
  const user = useAuthStore((s) => s.user);
  const orgId = useAppStore((s) => s.selectedOrgId) ?? user?.org_id ?? "";
  const branchId = useAppStore((s) => s.selectedBranchId) ?? "";

  // Filter state
  const [selBranch, setSelBranch] = useState(branchId);
  const [selShift, setSelShift] = useState<string>("all");
  const [selTeller, setSelTeller] = useState<string>("all");
  const [selPayment, setSelPayment] = useState<string>("all");
  const [selStatus, setSelStatus] = useState<string>("all");
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [selOrder, setSelOrder] = useState<Order | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", orgId],
    queryFn: () => branchesApi.getBranches(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  React.useEffect(() => {
    if (branches.length > 0 && !selBranch) setSelBranch(branches[0].id);
  }, [branches, selBranch]);

  const activeBranch = branches.find((b) => b.id === selBranch) ?? branches[0];

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ["shifts", activeBranch?.id],
    queryFn: () =>
      shiftsApi.getBranchShifts(activeBranch!.id).then((r) => r.data),
    enabled: !!activeBranch?.id,
  });

  const { data: discounts = [] } = useQuery({
    queryKey: ["discounts", orgId],
    queryFn: () => discountsApi.getDiscounts(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  // Fetch orders: if a shift is selected fetch by shift, otherwise by branch
  const queryParams =
    selShift !== "all"
      ? { shift_id: selShift }
      : { branch_id: activeBranch?.id };

  const {
    data: rawOrders = [],
    isLoading: ordersLoading,
    refetch,
  } = useQuery({
    queryKey: ["orders", selShift, activeBranch?.id],
    queryFn: () => ordersApi.getOrders(queryParams).then((r) => r.data),
    enabled: !!activeBranch?.id,
  });

  // Client-side filters
  const orders = useMemo(() => {
    let list = rawOrders;
    if (selTeller !== "all")
      list = list.filter((o) => o.teller_name === selTeller);
    if (selPayment !== "all")
      list = list.filter((o) => o.payment_method === selPayment);
    if (selStatus !== "all") list = list.filter((o) => o.status === selStatus);
    if (from)
      list = list.filter((o) => new Date(o.created_at) >= new Date(from));
    if (to) list = list.filter((o) => new Date(o.created_at) <= new Date(to));
    return list;
  }, [rawOrders, selTeller, selPayment, selStatus, from, to]);

  // Derived teller list for filter dropdown
  const tellers = useMemo(() => {
    const names = [...new Set(rawOrders.map((o) => o.teller_name))].sort();
    return names;
  }, [rawOrders]);

  // Summary stats
  const active = orders.filter((o) => o.status !== "voided");
  const voided = orders.filter((o) => o.status === "voided");
  const totalRevenue = active.reduce((s, o) => s + o.total_amount, 0);
  const totalDisc = active.reduce((s, o) => s + (o.discount_amount ?? 0), 0);
  const totalTip = active.reduce((s, o) => s + (o.tip_amount ?? 0), 0);

  // CSV export
  const exportCSV = () => {
    const header =
      "Order#,Time,Teller,Payment,Subtotal,Discount,Tax,Total,Customer,Status";
    const rows = orders
      .map((o) =>
        [
          o.order_number,
          fmtDateTime(o.created_at),
          o.teller_name,
          fmtPayment(o.payment_method),
          (o.subtotal / 100).toFixed(2),
          (o.discount_amount / 100).toFixed(2),
          (o.tax_amount / 100).toFixed(2),
          (o.total_amount / 100).toFixed(2),
          o.customer_name ?? "",
          o.status,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${activeBranch?.name ?? "export"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: ColumnDef<Order, any>[] = [
    {
      accessorKey: "order_number",
      header: "#",
      cell: ({ row }) => (
        <span
          className={`font-bold tabular-nums ${row.original.status === "voided" ? "text-muted-foreground line-through" : ""}`}
        >
          #{row.original.order_number}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Time",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {fmtDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: "teller_name",
      header: "Teller",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.teller_name}</span>
      ),
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.customer_name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "payment_method",
      header: "Payment",
      cell: ({ row }) => <PaymentBadge method={row.original.payment_method} />,
    },
    {
      accessorKey: "discount_amount",
      header: "Discount",
      cell: ({ row }) => {
        const o = row.original;
        if (!o.discount_amount)
          return <span className="text-muted-foreground text-xs">—</span>;
        const disc = discounts.find((d) => d.id === o.discount_id);
        return (
          <div>
            <span className="text-xs font-semibold text-green-600">
              −{egp(o.discount_amount)}
            </span>
            {disc && (
              <p className="text-[10px] text-muted-foreground">{disc.name}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "total_amount",
      header: "Total",
      cell: ({ row }) => (
        <span
          className={`font-bold tabular-nums ${row.original.status === "voided" ? "line-through text-muted-foreground" : ""}`}
        >
          {egp(row.original.total_amount)}
        </span>
      ),
    },
    {
      id: "change",
      header: "Change",
      cell: ({ row }) => {
        const c = row.original.change_given;
        if (!c || c === 0)
          return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="text-xs text-green-600 font-semibold tabular-nums">
            {egp(c)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "voided" ? (
          <Badge variant="destructive">
            <XCircle size={10} /> Voided
          </Badge>
        ) : (
          <Badge variant="success">Completed</Badge>
        ),
    },
    {
      id: "arrow",
      header: "",
      cell: () => <ChevronRight size={14} className="text-muted-foreground" />,
    },
  ];

  const resetFilters = () => {
    setSelShift("all");
    setSelTeller("all");
    setSelPayment("all");
    setSelStatus("all");
    setFrom(null);
    setTo(null);
  };
  const hasFilters =
    selShift !== "all" ||
    selTeller !== "all" ||
    selPayment !== "all" ||
    selStatus !== "all" ||
    !!from ||
    !!to;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5">
      <PageHeader
        title="Orders"
        sub="Browse, filter and export orders by branch and shift"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw size={13} /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={orders.length === 0}
            >
              <Download size={13} /> Export CSV
            </Button>
          </div>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Filter size={14} /> Filters
          </p>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs h-7"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Row 1: Branch + Shift + Teller + Payment + Status */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Branch */}
          {branches.length > 1 && (
            <div className="space-y-1">
              <Label className="text-xs">Branch</Label>
              <Select
                value={selBranch}
                onValueChange={(v) => {
                  setSelBranch(v);
                  setSelShift("all");
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Shift */}
          <div className="space-y-1">
            <Label className="text-xs">Shift</Label>
            <Select
              value={selShift}
              onValueChange={setSelShift}
              disabled={shiftsLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All shifts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shifts</SelectItem>
                {shifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.status === "open" ? "bg-green-500" : "bg-muted-foreground"}`}
                      />
                      {s.teller_name} · {fmtDate(s.opened_at)}
                      {s.status === "open" && " (open)"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teller */}
          <div className="space-y-1">
            <Label className="text-xs">Teller</Label>
            <Select value={selTeller} onValueChange={setSelTeller}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All tellers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tellers</SelectItem>
                {tellers.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment */}
          <div className="space-y-1">
            <Label className="text-xs">Payment</Label>
            <Select value={selPayment} onValueChange={setSelPayment}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {fmtPayment(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={selStatus} onValueChange={setSelStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Date range */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1.5">
            <Calendar size={11} /> Date Range
          </Label>
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, t) => {
              setFrom(f);
              setTo(t);
            }}
          />
        </div>
      </div>

      {/* ── Summary stats ────────────────────────────────────────────────────── */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { label: "Completed", value: active.length, color: "text-primary" },
            {
              label: "Voided",
              value: voided.length,
              color:
                voided.length > 0
                  ? "text-destructive"
                  : "text-muted-foreground",
            },
            {
              label: "Total Revenue",
              value: egp(totalRevenue),
              color: "text-green-600",
            },
            {
              label: "Total Discounts",
              value: egp(totalDisc),
              color: "text-amber-600",
            },
            {
              label: "Total Tips",
              value: egp(totalTip),
              color: "text-violet-600",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border bg-card p-4">
              <p className={`text-xl font-extrabold tabular-nums ${color}`}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      {!activeBranch ? (
        <EmptyState icon={ShoppingBag} title="Select a branch" />
      ) : ordersLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders match your filters"
          sub="Try adjusting the branch, shift or date range"
          action={
            hasFilters ? (
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          searchKey="teller_name"
          searchPlaceholder="Search by teller…"
          pageSize={30}
          onRowClick={setSelOrder}
        />
      )}

      {/* ── Order detail drawer ───────────────────────────────────────────────── */}
      <Dialog open={!!selOrder} onOpenChange={(o) => !o && setSelOrder(null)}>
        <DialogContent sheet="right" showClose={false} className="p-0">
          {selOrder && (
            <OrderDetailDrawer
              order={selOrder}
              onClose={() => setSelOrder(null)}
              discounts={discounts}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
