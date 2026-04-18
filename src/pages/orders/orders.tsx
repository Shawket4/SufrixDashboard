import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Ban, ChevronLeft, ChevronRight, CreditCard, Receipt, ShoppingBag, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/shared/ui/page-shell";
import { DataTable } from "@/shared/ui/data-table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/ui/empty-state";
import { StatCard } from "@/shared/ui/stat-card";
import { DateRangePicker } from "@/shared/ui/date-range-picker";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { orderApi } from "@/entities/order/api";
import { useOrders } from "@/entities/order/queries";
import { voidOrderSchema, type VoidOrderValues } from "@/entities/order/schemas";
import { useBranches } from "@/entities/branch/queries";
import { useShifts } from "@/entities/shift/queries";
import { PAYMENT_METHODS, QUERY_KEYS, PAYMENT_COLORS, ORDER_STATUSES } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import { fmtDateTime, fmtMoney, fmtUnit } from "@/shared/lib/format";
import { exportToExcel } from "@/shared/lib/excel";
import { apiClient } from "@/shared/api/client";
import type { Order, OrdersQuery, PaymentMethod, OrderStatus } from "@/shared/types";

function VoidDialog({ open, onClose, order }: { open: boolean; onClose: () => void; order: Order | null }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const form = useForm<VoidOrderValues>({
    resolver: zodResolver(voidOrderSchema),
    defaultValues: { reason: "customer_request", restore_inventory: true },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (v: VoidOrderValues) => orderApi.void(order!.id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("orders.voidedToast"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("orders.voidOrder")}</DialogTitle>
          <DialogDescription>
            {t("orders.orderNumber", { n: order?.order_number })} · {fmtMoney(order?.total_amount ?? 0)}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("orders.voidConfirm")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="customer_request">{t("orders.voidReasons.customer_request")}</SelectItem>
                      <SelectItem value="wrong_order">{t("orders.voidReasons.wrong_order")}</SelectItem>
                      <SelectItem value="quality_issue">{t("orders.voidReasons.quality_issue")}</SelectItem>
                      <SelectItem value="other">{t("orders.voidReasons.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="restore_inventory" render={({ field }) => (
                <FormItem className="flex items-center gap-2 rounded-lg bg-muted p-3 !space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!m-0 cursor-pointer">{t("orders.restoreInventory")}</FormLabel>
                </FormItem>
              )} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button type="submit" variant="destructive" loading={isPending}><Ban /> {t("orders.voidOrder")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailDrawer({ open, onClose, orderId, onVoid }: { open: boolean; onClose: () => void; orderId: string | null; onVoid: (o: Order) => void }) {
  const { t } = useTranslation();
  const { data: order, isLoading } = useQuery({
    queryKey: QUERY_KEYS.order(orderId ?? ""),
    queryFn: () => orderApi.get(orderId!),
    enabled: !!orderId,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent sheet="right" showClose={false} className="p-0">
        <div className="sticky top-0 z-10 bg-background border-b p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t("orders.title")}</p>
            {order && <p className="font-bold">{t("orders.orderNumber", { n: order.order_number })}</p>}
          </div>
          <div className="flex gap-1">
            {order && order.status === "completed" && (
              <Button size="sm" variant="destructive" onClick={() => onVoid(order)}><Ban /> {t("orders.voidOrder")}</Button>
            )}
            <Button variant="ghost" size="iconSm" onClick={onClose}><X /></Button>
          </div>
        </div>

        {isLoading || !order ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : (
          <div className="p-4 space-y-4">
            {order.status === "voided" && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 flex items-center gap-2 text-sm">
                  <Ban className="text-destructive" size={16} />
                  <div>
                    <p className="font-bold text-destructive">{t("orderStatus.voided")}</p>
                    {order.void_reason && <p className="text-xs text-muted-foreground">{t(`orders.voidReasons.${order.void_reason}`, { defaultValue: order.void_reason })}</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("common.date")}</span><span>{fmtDateTime(order.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("dashboard.teller")}</span><span>{order.teller_name}</span></div>
                {order.customer_name && <div className="flex justify-between"><span className="text-muted-foreground">{t("orders.customer")}</span><span>{order.customer_name}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">{t("orders.payment")}</span><Badge variant="outline">{t(`payments.${order.payment_method}`)}</Badge></div>
              </CardContent>
            </Card>

            {order.items && order.items.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("menu.items")}</p>
                  {order.items.map((it) => (
                    <div key={it.id} className="py-2 border-b last:border-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{it.item_name} {it.size_label && <span className="text-muted-foreground">({it.size_label})</span>}</p>
                          <p className="text-xs text-muted-foreground">× {it.quantity} · {fmtMoney(it.unit_price)}</p>
                          {it.addons.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {it.addons.map((a) => (
                                <p key={a.id} className="text-xs ps-2">+ {a.addon_name} {a.quantity > 1 && `×${a.quantity}`}{a.line_total > 0 && <span className="text-muted-foreground ms-1">({fmtMoney(a.line_total)})</span>}</p>
                              ))}
                            </div>
                          )}
                          {it.notes && <p className="text-xs italic text-muted-foreground mt-1">{it.notes}</p>}
                        </div>
                        <span className="font-semibold tabular text-sm flex-shrink-0">{fmtMoney(it.line_total)}</span>
                      </div>
                      {it.deductions_snapshot && it.deductions_snapshot.length > 0 && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer">{t("orders.ingredientsUsed")} ({it.deductions_snapshot.length})</summary>
                          <div className="ps-3 mt-1 space-y-0.5">
                            {it.deductions_snapshot.map((d, idx) => (
                              <p key={idx} className="tabular">{d.ingredient_name}: {Number(d.quantity).toFixed(3)} {fmtUnit(d.unit)}</p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("common.subtotal")}</span><span className="tabular">{fmtMoney(order.subtotal)}</span></div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-success"><span>{t("orders.discountAmount")}</span><span className="tabular">−{fmtMoney(order.discount_amount)}</span></div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("orders.tax")}</span><span className="tabular">{fmtMoney(order.tax_amount)}</span></div>
                )}
                {order.tip_amount ? (
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("orders.tip")}</span><span className="tabular">{fmtMoney(order.tip_amount)}</span></div>
                ) : null}
                <div className="flex justify-between pt-2 mt-2 border-t font-bold">
                  <span>{t("common.total")}</span>
                  <span className="tabular text-primary text-lg">{fmtMoney(order.total_amount)}</span>
                </div>
                {order.amount_tendered && (
                  <div className="flex justify-between text-xs text-muted-foreground pt-1"><span>{t("orders.cashTendered")}</span><span className="tabular">{fmtMoney(order.amount_tendered)}</span></div>
                )}
                {order.change_given ? (
                  <div className="flex justify-between text-xs text-muted-foreground"><span>{t("orders.changeGiven")}</span><span className="tabular">{fmtMoney(order.change_given)}</span></div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Orders() {
  const { t } = useTranslation();
  const { orgId, branchId: ctxBranch } = useCurrentContext();
  const { data: branches = [] } = useBranches(orgId);
  const [selBranch, setSelBranch] = useState<string>(ctxBranch ?? "");
  const [selShift, setSelShift] = useState<string>("");
  const [payment, setPayment] = useState<PaymentMethod | "">("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [tellerName, setTellerName] = useState("");
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 25;
  const [detailId, setDetailId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<Order | null>(null);

  useMemo(() => {
    if (!selBranch && branches.length > 0) setSelBranch(branches[0].id);
  }, [branches, selBranch]);

  const { data: shifts = [] } = useShifts(selBranch || null);

  const query: OrdersQuery = {
    branch_id: selBranch || undefined,
    shift_id: selShift || undefined,
    payment_method: payment || undefined,
    status: status || undefined,
    teller_name: tellerName || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    per_page: perPage,
  };

  const { data, isLoading } = useOrders(query, !!selBranch);
  const orders = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const stats = useMemo(() => {
    const rev = orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.total_amount, 0);
    const discounts = orders.reduce((s, o) => s + o.discount_amount, 0);
    const tips = orders.reduce((s, o) => s + (o.tip_amount ?? 0), 0);
    const voided = orders.filter((o) => o.status === "voided").length;
    return { rev, discounts, tips, voided };
  }, [orders]);

  const cols: ColumnDef<Order>[] = [
    {
      accessorKey: "order_number",
      header: "#",
      cell: ({ row }) => <span className="font-mono font-bold text-xs">#{row.original.order_number}</span>,
    },
    { accessorKey: "created_at", header: t("common.date"), cell: ({ row }) => <span className="text-xs">{fmtDateTime(row.original.created_at)}</span> },
    { accessorKey: "teller_name", header: t("dashboard.teller"), cell: ({ row }) => <span className="text-sm">{row.original.teller_name}</span> },
    { accessorKey: "customer_name", header: t("orders.customer"), cell: ({ row }) => <span className="text-sm">{row.original.customer_name ?? "—"}</span> },
    {
      accessorKey: "payment_method",
      header: t("orders.payment"),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: PAYMENT_COLORS[row.original.payment_method] }} />
          <Badge variant="outline" className="text-[10px]">{t(`payments.${row.original.payment_method}`)}</Badge>
        </span>
      ),
    },
    { accessorKey: "total_amount", header: t("common.total"), cell: ({ row }) => <span className="tabular font-semibold text-sm">{fmtMoney(row.original.total_amount)}</span> },
    {
      accessorKey: "status",
      header: t("common.status"),
      cell: ({ row }) => <Badge variant={row.original.status === "voided" ? "destructive" : "success"}>{t(`orderStatus.${row.original.status}`)}</Badge>,
    },
  ];

  const handleExport = async () => {
    if (!selBranch) return;
    try {
      const res = await apiClient.get<{ data: Order[]; total: number }>("/orders", {
        params: { ...query, page: 1, per_page: 999999 },
      });
      const all = res.data.data;
      await exportToExcel({
        filename: "Orders",
        sheets: [
          {
            name: "Orders",
            title: t("orders.title"),
            columns: [
              { key: "num", header: "#", accessor: (o: Order) => o.order_number, type: "integer", width: 10 },
              { key: "date", header: t("common.date"), accessor: (o: Order) => new Date(o.created_at), type: "dateTime", width: 20 },
              { key: "teller", header: t("dashboard.teller"), accessor: (o: Order) => o.teller_name, width: 18 },
              { key: "customer", header: t("orders.customer"), accessor: (o: Order) => o.customer_name ?? "—", width: 20 },
              { key: "payment", header: t("orders.payment"), accessor: (o: Order) => t(`payments.${o.payment_method}`), width: 16 },
              { key: "sub", header: t("common.subtotal"), accessor: (o: Order) => o.subtotal, type: "money", width: 14, total: true },
              { key: "disc", header: t("orders.discount"), accessor: (o: Order) => o.discount_amount, type: "money", width: 14, total: true },
              { key: "tax", header: t("orders.tax"), accessor: (o: Order) => o.tax_amount, type: "money", width: 12, total: true },
              { key: "tip", header: t("orders.tip"), accessor: (o: Order) => o.tip_amount ?? 0, type: "money", width: 12, total: true },
              { key: "total", header: t("common.total"), accessor: (o: Order) => o.total_amount, type: "money", width: 14, total: true },
              { key: "status", header: t("common.status"), accessor: (o: Order) => t(`orderStatus.${o.status}`), width: 14 },
            ],
            rows: all,
            totals: true,
          },
        ],
      });
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const clearFilters = () => {
    setSelShift("");
    setPayment("");
    setStatus("");
    setTellerName("");
    setFrom(null);
    setTo(null);
    setPage(1);
  };

  return (
    <PageShell
      title={t("orders.title")}
      description={t("orders.subtitle")}
      action={
        branches.length > 1 && (
          <Select value={selBranch} onValueChange={(v) => { setSelBranch(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        )
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("orders.totalRevenue")} value={fmtMoney(stats.rev)} loading={isLoading} icon={Receipt} accent="success" />
        <StatCard label={t("orders.completed")} value={total - stats.voided} loading={isLoading} icon={ShoppingBag} accent="info" />
        <StatCard label={t("orders.voidedOrders")} value={stats.voided} loading={isLoading} icon={Ban} accent="destructive" />
        <StatCard label={t("orders.totalDiscounts")} value={fmtMoney(stats.discounts)} loading={isLoading} icon={CreditCard} accent="warning" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selShift || "all"} onValueChange={(v) => { setSelShift(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-48"><SelectValue placeholder={t("orders.allShifts")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.allShifts")}</SelectItem>
                {shifts.map((s) => <SelectItem key={s.id} value={s.id}>{s.teller_name} · {fmtDateTime(s.opened_at)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={payment || "all"} onValueChange={(v) => { setPayment(v === "all" ? "" : (v as PaymentMethod)); setPage(1); }}>
              <SelectTrigger className="h-9 w-40"><SelectValue placeholder={t("orders.allMethods")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.allMethods")}</SelectItem>
                {PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{t(`payments.${p}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : (v as OrderStatus)); setPage(1); }}>
              <SelectTrigger className="h-9 w-36"><SelectValue placeholder={t("orders.allStatuses")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.allStatuses")}</SelectItem>
                {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`orderStatus.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            {(selShift || payment || status || tellerName || from || to) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X size={12} /> {t("common.clearAll")}</Button>
            )}
          </div>
          <DateRangePicker from={from} to={to} onChange={(f, tt) => { setFrom(f); setTo(tt); setPage(1); }} />
        </CardContent>
      </Card>

      {!selBranch ? (
        <EmptyState icon={ShoppingBag} title={t("orders.selectBranch")} />
      ) : orders.length === 0 && !isLoading ? (
        <EmptyState icon={ShoppingBag} title={t("orders.noMatch")} description={t("orders.noMatchHint")} />
      ) : (
        <>
          <DataTable
            columns={cols}
            data={orders}
            isLoading={isLoading}
            onRowClick={(o) => setDetailId(o.id)}
            onExport={handleExport}
            rowClassName={(r) => r.original.status === "voided" ? "opacity-60" : undefined}
          />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">
              {t("orders.showing", {
                from: (page - 1) * perPage + 1,
                to: Math.min(page * perPage, total),
                total,
              })}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="iconSm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="rtl:rotate-180" /></Button>
              <span className="px-3 text-sm font-medium">{page} / {totalPages}</span>
              <Button variant="outline" size="iconSm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="rtl:rotate-180" /></Button>
            </div>
          </div>
        </>
      )}

      <OrderDetailDrawer
        open={!!detailId}
        onClose={() => setDetailId(null)}
        orderId={detailId}
        onVoid={(o) => { setDetailId(null); setVoidTarget(o); }}
      />
      <VoidDialog
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        order={voidTarget}
        key={voidTarget?.id ?? "none"}
      />
    </PageShell>
  );
}
