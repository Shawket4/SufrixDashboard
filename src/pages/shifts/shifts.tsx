import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Clock, DollarSign,
  FileText, Plus, Printer, ShieldAlert, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/shared/ui/page-shell";
import { DataTable } from "@/shared/ui/data-table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StatCard } from "@/shared/ui/stat-card";
import { shiftApi } from "@/entities/shift/api";
import { useShifts, useCurrentShift, useShiftReport } from "@/entities/shift/queries";
import { useBranches } from "@/entities/branch/queries";
import {
  openShiftSchema, closeShiftSchema, forceCloseSchema, cashMovementSchema,
  type OpenShiftValues, type CloseShiftValues, type ForceCloseValues, type CashMovementValues,
} from "@/entities/shift/schemas";
import { QUERY_KEYS } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import { fmtDateTime, fmtDuration, fmtMoney } from "@/shared/lib/format";
import { exportToExcel } from "@/shared/lib/excel";
import type { ShiftStatus } from "@/shared/config/constants";
import type { Shift } from "@/shared/types";

function OpenShiftDialog({ open, onClose, branchId, suggested }: { open: boolean; onClose: () => void; branchId: string; suggested: number }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const form = useForm<OpenShiftValues>({
    resolver: zodResolver(openShiftSchema),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: { opening_cash: (suggested / 100) as any },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (v: OpenShiftValues) => shiftApi.open(branchId, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.shifts(branchId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.shiftPreFill(branchId) });
      toast.success(t("shifts.toasts.opened"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("shifts.openShift")}</DialogTitle>
          {suggested > 0 && <DialogDescription>{t("shifts.suggestedOpening", { amount: fmtMoney(suggested) })}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField
                control={form.control}
                name="opening_cash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("shifts.openingCash")} (EGP)</FormLabel>
                    <FormControl>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Input type="number" step="0.01" min="0" autoFocus {...(field as any)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button type="submit" loading={isPending}>{t("shifts.openShift")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CloseShiftDialog({ open, onClose, shiftId }: { open: boolean; onClose: () => void; shiftId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const form = useForm<CloseShiftValues>({
    resolver: zodResolver(closeShiftSchema),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: { closing_cash_declared: 0 as any, notes: "" },
  });
  const { mutate, isPending } = useMutation({
    mutationFn: (v: CloseShiftValues) => shiftApi.close(shiftId, { ...v, notes: v.notes || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success(t("shifts.toasts.closed"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("shifts.close")}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField control={form.control} name="closing_cash_declared" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shifts.closingCashDeclared")} (EGP)</FormLabel>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <FormControl><Input type="number" step="0.01" min="0" autoFocus {...(field as any)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>{t("common.notes")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button type="submit" loading={isPending}>{t("shifts.close")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ForceCloseDialog({ open, onClose, shiftId }: { open: boolean; onClose: () => void; shiftId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const form = useForm<ForceCloseValues>({ resolver: zodResolver(forceCloseSchema), defaultValues: { reason: "" } });
  const { mutate, isPending } = useMutation({
    mutationFn: (v: ForceCloseValues) => shiftApi.forceClose(shiftId, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success(t("shifts.toasts.forceClosed"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
              <ShieldAlert className="text-warning" size={18} />
            </div>
            <div>
              <DialogTitle>{t("shifts.forceClose")}</DialogTitle>
              <DialogDescription>{t("shifts.forceCloseWarning")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shifts.forceCloseReason")}</FormLabel>
                  <FormControl><Input placeholder={t("shifts.forceCloseReasonPh")} autoFocus {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button type="submit" variant="warning" loading={isPending}>{t("shifts.forceClose")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CashMovementDialog({ open, onClose, shiftId }: { open: boolean; onClose: () => void; shiftId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const form = useForm<CashMovementValues>({
    resolver: zodResolver(cashMovementSchema),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: { direction: "in", amount: 0 as any, note: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (v: CashMovementValues) => {
      const amount = v.direction === "out" ? -v.amount : v.amount;
      return shiftApi.addMovement(shiftId, { amount, note: v.note });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success(t("shifts.toasts.cashRecorded"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const dir = form.watch("direction");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("shifts.cashDialog.title")}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField control={form.control} name="direction" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shifts.cashDialog.direction")}</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange("in")}
                      className={`rounded-lg border p-3 text-start transition-colors ${dir === "in" ? "border-success bg-success/5" : "border-input hover:bg-muted"}`}
                    >
                      <ArrowDownCircle className={dir === "in" ? "text-success" : "text-muted-foreground"} size={16} />
                      <p className="text-sm font-semibold mt-1">{t("shifts.cashDialog.in")}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("out")}
                      className={`rounded-lg border p-3 text-start transition-colors ${dir === "out" ? "border-destructive bg-destructive/5" : "border-input hover:bg-muted"}`}
                    >
                      <ArrowUpCircle className={dir === "out" ? "text-destructive" : "text-muted-foreground"} size={16} />
                      <p className="text-sm font-semibold mt-1">{t("shifts.cashDialog.out")}</p>
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.amount")} (EGP)</FormLabel>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <FormControl><Input type="number" step="0.01" min="0.01" autoFocus {...(field as any)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.notes")}</FormLabel>
                  <FormControl><Input placeholder={t("shifts.cashDialog.notePh")} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button type="submit" loading={isPending}>{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ShiftReportDrawer({ open, onClose, shiftId }: { open: boolean; onClose: () => void; shiftId: string | null }) {
  const { t } = useTranslation();
  const { data: report, isLoading } = useShiftReport(shiftId);

  const handlePrint = () => {
    if (!report) return;
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return;
    const rows = report.payment_summary
      .map((p) => `<tr><td>${t(`payments.${p.payment_method}`)}</td><td class="r">${p.order_count}</td><td class="r">${fmtMoney(p.total)}</td></tr>`)
      .join("");
    const movRows = report.cash_movements
      .map((m) => `<tr><td>${m.note}</td><td class="r ${m.amount >= 0 ? "pos" : "neg"}">${fmtMoney(Math.abs(m.amount))}</td></tr>`)
      .join("");
    w.document.write(`<!doctype html><html><head><title>Shift Report</title><style>
      body{font-family:'Cairo',sans-serif;padding:20px;font-size:12px}
      h1{font-size:14px;margin:0 0 4px;text-align:center}
      h2{font-size:11px;margin:16px 0 4px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}
      td{padding:3px 0;border-bottom:1px dashed #eee}
      .r{text-align:end}
      .bold{font-weight:700}
      .pos{color:#16a34a}
      .neg{color:#dc2626}
    </style></head><body>
      <h1>Shift Report</h1>
      <p style="text-align:center;font-size:10px;color:#666">${fmtDateTime(report.shift.opened_at)} → ${report.shift.closed_at ? fmtDateTime(report.shift.closed_at) : "now"}</p>
      <p style="text-align:center;font-size:10px">Teller: ${report.shift.teller_name}</p>
      <h2>Payment Breakdown</h2>
      <table>${rows}</table>
      <h2>Cash Summary</h2>
      <table>
        <tr><td>Opening Cash</td><td class="r">${fmtMoney(report.shift.opening_cash)}</td></tr>
        <tr><td>Cash Sales</td><td class="r">${fmtMoney(report.payment_summary.find(p => p.payment_method === "cash")?.total ?? 0)}</td></tr>
        <tr><td>Net Movements</td><td class="r">${fmtMoney(report.cash_movements_net)}</td></tr>
        <tr class="bold"><td>Expected</td><td class="r">${fmtMoney((report.shift.closing_cash_system ?? 0))}</td></tr>
        ${report.shift.closing_cash_declared !== null ? `<tr class="bold"><td>Declared</td><td class="r">${fmtMoney(report.shift.closing_cash_declared)}</td></tr>` : ""}
      </table>
      ${movRows ? `<h2>Cash Movements</h2><table>${movRows}</table>` : ""}
      <p style="text-align:center;font-size:9px;color:#999;margin-top:24px">Printed ${new Date().toLocaleString()}</p>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent sheet="right" showClose={false} className="p-0">
        <div className="sticky top-0 z-10 bg-background border-b p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t("shifts.report.title")}</p>
            {report && <p className="font-bold">{report.shift.teller_name}</p>}
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="iconSm" onClick={handlePrint} disabled={!report}><Printer size={14} /></Button>
            <Button variant="ghost" size="iconSm" onClick={onClose}><X /></Button>
          </div>
        </div>

        {isLoading || !report ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : (
          <div className="p-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("shifts.opened")}</span><span>{fmtDateTime(report.shift.opened_at)}</span></div>
                {report.shift.closed_at ? (
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("shifts.closed")}</span><span>{fmtDateTime(report.shift.closed_at)}</span></div>
                ) : (
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("common.status")}</span><Badge variant="success">{t("shiftStatus.open")}</Badge></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">{t("shifts.duration")}</span><span className="font-mono">{fmtDuration(report.shift.opened_at, report.shift.closed_at)}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("shifts.report.paymentBreakdown")}</p>
                {report.payment_summary.map((p) => (
                  <div key={p.payment_method} className="flex items-center justify-between py-1 border-b last:border-0">
                    <span className="text-sm">{t(`payments.${p.payment_method}`)} <span className="text-muted-foreground text-xs">× {p.order_count}</span></span>
                    <span className="font-semibold tabular">{fmtMoney(p.total)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 mt-2 border-t">
                  <span className="text-sm font-bold">{t("shifts.report.totalRevenue")}</span>
                  <span className="text-lg font-bold text-primary tabular">{fmtMoney(report.total_payments)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("shifts.report.cashSummary")}</p>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("shifts.openingCash")}</span><span className="tabular">{fmtMoney(report.shift.opening_cash)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("shifts.report.cashSales")}</span><span className="tabular">{fmtMoney(report.payment_summary.find(p => p.payment_method === "cash")?.total ?? 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("shifts.report.movementsIn")}</span><span className="tabular text-success">+{fmtMoney(report.cash_movements_in)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("shifts.report.movementsOut")}</span><span className="tabular text-destructive">{fmtMoney(report.cash_movements_out)}</span></div>
                <div className="flex justify-between text-sm pt-2 border-t mt-2"><span className="font-bold">{t("shifts.expectedCash")}</span><span className="tabular font-bold">{fmtMoney(report.shift.closing_cash_system ?? 0)}</span></div>
                {report.shift.closing_cash_declared !== null && (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("shifts.declaredCash")}</span><span className="tabular">{fmtMoney(report.shift.closing_cash_declared)}</span></div>
                    {report.shift.cash_discrepancy !== null && (
                      <div className={`flex justify-between text-sm font-bold ${report.shift.cash_discrepancy === 0 ? "text-muted-foreground" : report.shift.cash_discrepancy > 0 ? "text-success" : "text-destructive"}`}>
                        <span>{t("shifts.cashDiscrepancy")}</span>
                        <span className="tabular">
                          {report.shift.cash_discrepancy === 0 ? t("shifts.exactMatch") : `${report.shift.cash_discrepancy > 0 ? t("shifts.over") : t("shifts.short")} ${fmtMoney(Math.abs(report.shift.cash_discrepancy))}`}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {report.cash_movements.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("shifts.report.movements")}</p>
                  {report.cash_movements.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b last:border-0 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{m.note}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtDateTime(m.created_at)}</p>
                      </div>
                      <span className={`font-semibold tabular ${m.amount >= 0 ? "text-success" : "text-destructive"}`}>
                        {m.amount >= 0 ? "+" : "−"}{fmtMoney(Math.abs(m.amount))}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const STATUS_VARIANT: Record<ShiftStatus, "success" | "secondary" | "warning"> = {
  open: "success",
  closed: "secondary",
  force_closed: "warning",
};

export default function Shifts() {
  const { t } = useTranslation();
  const { orgId, branchId: ctxBranch } = useCurrentContext();
  const { data: branches = [] } = useBranches(orgId);
  const [selBranch, setSelBranch] = useState<string>(ctxBranch ?? "");

  useMemo(() => {
    if (!selBranch && branches.length > 0) setSelBranch(branches[0].id);
  }, [branches, selBranch]);

  const { data: shifts = [], isLoading } = useShifts(selBranch || null);
  const { data: preFill } = useCurrentShift(selBranch || null);

  const [openDlg, setOpenDlg] = useState(false);
  const [closeDlg, setCloseDlg] = useState(false);
  const [forceDlg, setForceDlg] = useState(false);
  const [cashDlg, setCashDlg] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const openShift = preFill?.open_shift ?? null;

  const cols: ColumnDef<Shift>[] = [
    {
      accessorKey: "teller_name",
      header: t("shifts.teller", { defaultValue: t("dashboard.teller") }),
      cell: ({ row }) => <span className="font-semibold text-sm">{row.original.teller_name}</span>,
    },
    {
      accessorKey: "status",
      header: t("common.status"),
      cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{t(`shiftStatus.${row.original.status}`)}</Badge>,
    },
    { accessorKey: "opened_at", header: t("shifts.opened"), cell: ({ row }) => <span className="text-xs">{fmtDateTime(row.original.opened_at)}</span> },
    {
      accessorKey: "closed_at",
      header: t("shifts.closed"),
      cell: ({ row }) => row.original.closed_at ? <span className="text-xs">{fmtDateTime(row.original.closed_at)}</span> : <span className="text-success text-xs font-semibold">{t("shifts.stillOpen")}</span>,
    },
    { accessorKey: "opening_cash", header: t("shifts.openingCash"), cell: ({ row }) => <span className="tabular text-sm">{fmtMoney(row.original.opening_cash)}</span> },
    {
      accessorKey: "cash_discrepancy",
      header: t("shifts.cashDiscrepancy"),
      cell: ({ row }) => {
        const d = row.original.cash_discrepancy;
        if (d === null || d === undefined) return <span className="text-muted-foreground">—</span>;
        return <span className={`tabular text-sm font-semibold ${d === 0 ? "" : d > 0 ? "text-success" : "text-destructive"}`}>{d >= 0 ? "+" : "−"}{fmtMoney(Math.abs(d))}</span>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="iconSm" onClick={(e) => { e.stopPropagation(); setReportId(row.original.id); }}><FileText size={13} /></Button>
      ),
    },
  ];

  const handleExport = () =>
    exportToExcel({
      filename: "Shifts",
      sheets: [
        {
          name: "Shifts",
          title: t("shifts.title"),
          columns: [
            { key: "teller", header: t("dashboard.teller"), accessor: (s: Shift) => s.teller_name, width: 22 },
            { key: "status", header: t("common.status"), accessor: (s: Shift) => t(`shiftStatus.${s.status}`), width: 16 },
            { key: "opened", header: t("shifts.opened"), accessor: (s: Shift) => new Date(s.opened_at), type: "dateTime", width: 22 },
            { key: "closed", header: t("shifts.closed"), accessor: (s: Shift) => s.closed_at ? new Date(s.closed_at) : "—", type: "dateTime", width: 22 },
            { key: "opening", header: t("shifts.openingCash"), accessor: (s: Shift) => s.opening_cash, type: "money", width: 16, total: true },
            { key: "declared", header: t("shifts.declaredCash"), accessor: (s: Shift) => s.closing_cash_declared ?? 0, type: "money", width: 16, total: true },
            { key: "discrepancy", header: t("shifts.cashDiscrepancy"), accessor: (s: Shift) => s.cash_discrepancy ?? 0, type: "money", width: 16, total: true },
          ],
          rows: shifts,
          totals: true,
        },
      ],
    });

  return (
    <PageShell
      title={t("shifts.title")}
      description={t("shifts.subtitle")}
      action={
        branches.length > 1 && (
          <Select value={selBranch} onValueChange={setSelBranch}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        )
      }
    >
      {openShift && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <p className="font-bold">{t("shifts.shiftIsOpen")}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{openShift.teller_name} · {fmtDuration(openShift.opened_at)}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setCashDlg(true)}><DollarSign /> {t("shifts.cashMovement")}</Button>
              <Button size="sm" variant="outline" onClick={() => setReportId(openShift.id)}><FileText /> {t("shifts.reportBtn")}</Button>
              <Button size="sm" variant="warning" onClick={() => setForceDlg(true)}><AlertTriangle /> {t("shifts.forceClose")}</Button>
              <Button size="sm" onClick={() => setCloseDlg(true)}><Clock /> {t("shifts.close")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!openShift && selBranch && (
        <div className="flex justify-end">
          <Button onClick={() => setOpenDlg(true)}><Plus /> {t("shifts.openShift")}</Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("common.total")} value={shifts.length} loading={isLoading} />
        <StatCard label={t("shiftStatus.open")} value={shifts.filter((s) => s.status === "open").length} loading={isLoading} accent="success" icon={Clock} />
        <StatCard label={t("shiftStatus.closed")} value={shifts.filter((s) => s.status === "closed").length} loading={isLoading} accent="info" />
        <StatCard label={t("shiftStatus.force_closed")} value={shifts.filter((s) => s.status === "force_closed").length} loading={isLoading} accent="warning" />
      </div>

      {!selBranch ? (
        <EmptyState icon={Clock} title={t("orders.selectBranch")} />
      ) : shifts.length === 0 && !isLoading ? (
        <EmptyState icon={Clock} title={t("shifts.noShiftsYet")} description={t("shifts.noShiftsHint")} />
      ) : (
        <DataTable columns={cols} data={shifts} isLoading={isLoading} searchKey="teller_name" onExport={handleExport} />
      )}

      {selBranch && (
        <OpenShiftDialog
          open={openDlg}
          onClose={() => setOpenDlg(false)}
          branchId={selBranch}
          suggested={preFill?.suggested_opening_cash ?? 0}
          key={`open-${preFill?.suggested_opening_cash ?? 0}`}
        />
      )}
      {openShift && <CloseShiftDialog open={closeDlg} onClose={() => setCloseDlg(false)} shiftId={openShift.id} />}
      {openShift && <ForceCloseDialog open={forceDlg} onClose={() => setForceDlg(false)} shiftId={openShift.id} />}
      {openShift && <CashMovementDialog open={cashDlg} onClose={() => setCashDlg(false)} shiftId={openShift.id} />}

      <ShiftReportDrawer open={!!reportId} onClose={() => setReportId(null)} shiftId={reportId} />
    </PageShell>
  );
}
