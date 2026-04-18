import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { type ColumnDef } from "@tanstack/react-table";
import { CheckCircle, DollarSign, Edit2, Percent, Plus, Tag, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/shared/ui/page-shell";
import { DataTable } from "@/shared/ui/data-table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { StatCard } from "@/shared/ui/stat-card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { discountApi } from "@/entities/discount/api";
import { useDiscounts } from "@/entities/discount/queries";
import { discountSchema, type DiscountValues } from "@/entities/discount/schemas";
import { QUERY_KEYS } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import { fmtMoney } from "@/shared/lib/format";
import { exportToExcel } from "@/shared/lib/excel";
import type { Discount } from "@/shared/types";

function DiscountDialog({ open, onClose, edit, orgId }: { open: boolean; onClose: () => void; edit?: Discount | null; orgId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const form = useForm<DiscountValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: edit?.name ?? "",
      dtype: edit?.dtype ?? "percentage",
      percent_value: edit?.dtype === "percentage" ? edit.value : undefined,
      fixed_value: edit?.dtype === "fixed" ? edit.value / 100 : undefined,
      is_active: edit?.is_active ?? true,
    },
  });

  const dtype = form.watch("dtype");

  const { mutate, isPending } = useMutation({
    mutationFn: (v: DiscountValues) => {
      const value = v.dtype === "percentage" ? v.percent_value! : v.fixed_value!;
      const payload = { name: v.name, dtype: v.dtype, value, is_active: v.is_active };
      return edit ? discountApi.update(edit.id, payload) : discountApi.create({ ...payload, org_id: orgId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.discounts(orgId) });
      toast.success(edit ? t("discounts.updatedToast") : t("discounts.createdToast"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? t("discounts.editTitle") : t("discounts.newTitle")}</DialogTitle>
          <DialogDescription>{t("discounts.subtitle")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("discounts.discountName")}</FormLabel>
                    <FormControl><Input placeholder={t("discounts.namePh")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="dtype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("discounts.dtype")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">
                            <span className="flex items-center gap-2"><Percent size={13} /> {t("discounts.percentage")}</span>
                          </SelectItem>
                          <SelectItem value="fixed">
                            <span className="flex items-center gap-2"><DollarSign size={13} /> {t("discounts.fixed")}</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {dtype === "percentage" ? (
                  <FormField
                    control={form.control}
                    name="percent_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("discounts.percentageValue")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            placeholder={t("discounts.valuePhPct")}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="fixed_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("discounts.amountValue")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder={t("discounts.valuePhFixed")}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg bg-muted p-3 !space-y-0">
                    <div>
                      <FormLabel>{t("common.active")}</FormLabel>
                      <p className="text-xs text-muted-foreground">{t("discounts.activeHint")}</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button type="submit" loading={isPending}>{edit ? t("common.saveChanges") : t("common.create")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Discounts() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { orgId } = useCurrentContext();
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editItem, setEditItem] = useState<Discount | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Discount | null>(null);

  const { data: discounts = [], isLoading } = useDiscounts(orgId);

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (id: string) => discountApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.discounts(orgId ?? "") });
      toast.success(t("discounts.deletedToast"));
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: (d: Discount) => discountApi.update(d.id, { is_active: !d.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.discounts(orgId ?? "") }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns: ColumnDef<Discount>[] = [
    {
      accessorKey: "name",
      header: t("discounts.discountName"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${row.original.dtype === "percentage" ? "bg-violet-100 dark:bg-violet-950/50" : "bg-success/10"}`}>
            {row.original.dtype === "percentage"
              ? <Percent size={13} className="text-violet-600 dark:text-violet-400" />
              : <DollarSign size={13} className="text-success" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.dtype === "percentage" ? `${row.original.value}% off` : `${fmtMoney(row.original.value)} off`}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "dtype",
      header: t("common.type"),
      cell: ({ row }) => (
        <Badge variant={row.original.dtype === "percentage" ? "info" : "success"}>
          {row.original.dtype === "percentage" ? t("discounts.percentage") : t("discounts.fixed")}
        </Badge>
      ),
    },
    {
      accessorKey: "value",
      header: t("discounts.value"),
      cell: ({ row }) => (
        <span className="font-semibold tabular text-sm">
          {row.original.dtype === "percentage" ? `${row.original.value}%` : fmtMoney(row.original.value)}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: t("common.status"),
      cell: ({ row }) => (
        <button onClick={(e) => { e.stopPropagation(); toggleActive(row.original); }}>
          {row.original.is_active
            ? <Badge variant="success"><CheckCircle size={11} /> {t("common.active")}</Badge>
            : <Badge variant="outline"><XCircle size={11} /> {t("common.inactive")}</Badge>}
        </button>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="iconSm" onClick={() => { setEditItem(row.original); setDlgOpen(true); }}>
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => setConfirmDelete(row.original)}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  const handleExport = () =>
    exportToExcel({
      filename: "Discounts",
      sheets: [
        {
          name: "Discounts",
          title: t("discounts.title"),
          columns: [
            { key: "name", header: t("discounts.discountName"), accessor: (d: Discount) => d.name, width: 28 },
            { key: "dtype", header: t("common.type"), accessor: (d: Discount) => (d.dtype === "percentage" ? t("discounts.percentage") : t("discounts.fixed")), width: 16 },
            {
              key: "value",
              header: t("discounts.value"),
              accessor: (d: Discount) => (d.dtype === "percentage" ? d.value : d.value),
              // percentage values stay as numbers; fixed values are piastres → money
              type: "number",
              width: 14,
            },
            { key: "is_active", header: t("common.status"), accessor: (d: Discount) => d.is_active, type: "bool", width: 12 },
          ],
          rows: discounts,
        },
      ],
    });

  if (!orgId) return <PageShell title={t("discounts.title")} description={t("discounts.subtitle")}>{null}</PageShell>;

  const active = discounts.filter((d) => d.is_active).length;
  const pct = discounts.filter((d) => d.dtype === "percentage").length;
  const fixed = discounts.filter((d) => d.dtype === "fixed").length;

  return (
    <PageShell
      title={t("discounts.title")}
      description={t("discounts.subtitle")}
      action={<Button onClick={() => { setEditItem(null); setDlgOpen(true); }}><Plus /> {t("common.new")}</Button>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("common.total")} value={discounts.length} loading={isLoading} />
        <StatCard label={t("common.active")} value={active} loading={isLoading} accent="success" />
        <StatCard label={t("discounts.percentage")} value={pct} loading={isLoading} accent="violet" />
        <StatCard label={t("discounts.fixed")} value={fixed} loading={isLoading} accent="warning" />
      </div>

      {discounts.length === 0 && !isLoading ? (
        <div className="rounded-xl border bg-card p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Tag size={24} className="text-muted-foreground" />
          </div>
          <p className="font-semibold">{t("discounts.empty")}</p>
          <p className="text-sm text-muted-foreground max-w-xs">{t("discounts.emptyHint")}</p>
          <Button onClick={() => setDlgOpen(true)}>
            <Plus /> {t("discounts.createFirst")}
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={discounts}
          isLoading={isLoading}
          searchKey="name"
          onExport={handleExport}
        />
      )}

      <DiscountDialog
        open={dlgOpen}
        onClose={() => { setDlgOpen(false); setEditItem(null); }}
        edit={editItem}
        orgId={orgId}
        key={editItem?.id ?? "new"}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("common.confirmDelete", { name: confirmDelete?.name ?? "" })}
        destructive
        loading={removing}
        onConfirm={() => confirmDelete && remove(confirmDelete.id)}
      />
    </PageShell>
  );
}
