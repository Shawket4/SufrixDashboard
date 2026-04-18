import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { type ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Edit2, GitBranch, MapPin, Phone, Plus, Printer, Trash2, XCircle } from "lucide-react";
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
import { branchApi } from "@/entities/branch/api";
import { useBranches } from "@/entities/branch/queries";
import { branchSchema, type BranchValues } from "@/entities/branch/schemas";
import { QUERY_KEYS, PRINTER_BRANDS } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import { exportToExcel } from "@/shared/lib/excel";
import type { Branch } from "@/shared/types";

function BranchDialog({ open, onClose, edit, orgId }: { open: boolean; onClose: () => void; edit?: Branch | null; orgId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const form = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: edit?.name ?? "",
      address: edit?.address ?? "",
      phone: edit?.phone ?? "",
      timezone: edit?.timezone ?? "Africa/Cairo",
      is_active: edit?.is_active ?? true,
      printer_brand: edit?.printer_brand ?? "none",
      printer_ip: edit?.printer_ip ?? "",
      printer_port: edit?.printer_port ?? 9100,
    },
  });

  const printerBrand = form.watch("printer_brand");

  const { mutate, isPending } = useMutation({
    mutationFn: (v: BranchValues) => {
      const hasPrinter = v.printer_brand !== "none";
      const payload = {
        org_id: orgId,
        name: v.name,
        address: v.address || null,
        phone: v.phone || null,
        timezone: v.timezone,
        is_active: v.is_active,
        printer_brand: hasPrinter ? (v.printer_brand as "star" | "epson") : null,
        printer_ip: hasPrinter ? (v.printer_ip ?? null) : null,
        printer_port: hasPrinter ? (v.printer_port ?? null) : null,
      };
      return edit ? branchApi.update(edit.id, payload) : branchApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.branches(orgId) });
      toast.success(edit ? t("branches.updatedToast") : t("branches.createdToast"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{edit ? t("branches.editTitle") : t("branches.newTitle")}</DialogTitle>
          <DialogDescription>{t("branches.subtitle")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branches.branchName")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("branches.phone")}</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("branches.timezone")}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("branches.address")}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Printer size={14} className="text-muted-foreground" />
                  <p className="text-sm font-semibold">{t("branches.printerConfig")}</p>
                </div>
                <FormField
                  control={form.control}
                  name="printer_brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("branches.printerBrand")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t("branches.brands.none")}</SelectItem>
                          {PRINTER_BRANDS.map((b) => (
                            <SelectItem key={b} value={b}>{t(`branches.brands.${b}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {printerBrand !== "none" && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="printer_ip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("branches.printerIp")}</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ""} placeholder="192.168.1.100" className="font-mono" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="printer_port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("branches.printerPort")}</FormLabel>
                          <FormControl><Input type="number" {...field} value={field.value ?? 9100} className="font-mono" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {edit && (
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg bg-muted p-3 !space-y-0">
                      <div>
                        <FormLabel>{t("common.active")}</FormLabel>
                        <p className="text-xs text-muted-foreground">{t("users.activeHint")}</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
              )}
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

export default function Branches() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { orgId } = useCurrentContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Branch | null>(null);

  const { data: branches = [], isLoading } = useBranches(orgId);

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (id: string) => branchApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.branches(orgId) });
      toast.success(t("branches.deletedToast"));
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const columns: ColumnDef<Branch>[] = [
    {
      accessorKey: "name",
      header: t("common.name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <GitBranch size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{row.original.name}</p>
            {row.original.address && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <MapPin size={9} /> {row.original.address}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: t("branches.phone"),
      cell: ({ row }) =>
        row.original.phone ? (
          <span className="text-sm font-mono flex items-center gap-1"><Phone size={11} />{row.original.phone}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      accessorKey: "printer_brand",
      header: t("branches.printer"),
      cell: ({ row }) =>
        row.original.printer_brand ? (
          <div className="flex items-center gap-1.5">
            <Printer size={12} className="text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold capitalize">{row.original.printer_brand}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{row.original.printer_ip}:{row.original.printer_port}</p>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">{t("branches.noPrinter")}</span>
        ),
    },
    {
      accessorKey: "is_active",
      header: t("common.status"),
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="success"><CheckCircle size={11} /> {t("common.active")}</Badge>
        ) : (
          <Badge variant="destructive"><XCircle size={11} /> {t("common.inactive")}</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="iconSm" onClick={() => { setEditBranch(row.original); setDialogOpen(true); }}>
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
      filename: "Branches",
      sheets: [
        {
          name: "Branches",
          title: t("branches.title"),
          columns: [
            { key: "name", header: t("common.name"), accessor: (b: Branch) => b.name, width: 28 },
            { key: "address", header: t("branches.address"), accessor: (b: Branch) => b.address ?? "—", width: 32 },
            { key: "phone", header: t("branches.phone"), accessor: (b: Branch) => b.phone ?? "—", width: 18 },
            { key: "timezone", header: t("branches.timezone"), accessor: (b: Branch) => b.timezone, width: 18 },
            { key: "printer", header: t("branches.printer"), accessor: (b: Branch) => (b.printer_brand ? `${b.printer_brand} @ ${b.printer_ip}:${b.printer_port}` : "—"), width: 26 },
            { key: "is_active", header: t("common.status"), accessor: (b: Branch) => b.is_active, type: "bool", width: 12 },
          ],
          rows: branches,
        },
      ],
    });

  if (!orgId) return <PageShell title={t("branches.title")} description={t("branches.subtitle")}>{null}</PageShell>;

  return (
    <PageShell
      title={t("branches.title")}
      description={t("branches.subtitle")}
      action={<Button onClick={() => { setEditBranch(null); setDialogOpen(true); }}><Plus /> {t("common.new")}</Button>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("common.total")} value={branches.length} loading={isLoading} />
        <StatCard label={t("common.active")} value={branches.filter((b) => b.is_active).length} loading={isLoading} accent="success" />
        <StatCard label={t("branches.withPrinter")} value={branches.filter((b) => b.printer_brand).length} loading={isLoading} accent="violet" />
        <StatCard label={t("common.inactive")} value={branches.filter((b) => !b.is_active).length} loading={isLoading} accent="warning" />
      </div>

      <DataTable
        columns={columns}
        data={branches}
        isLoading={isLoading}
        searchKey="name"
        onExport={handleExport}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-4">
            <GitBranch size={32} className="text-muted-foreground/40" />
            <p>{t("common.noResults")}</p>
          </div>
        }
      />

      <BranchDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditBranch(null); }}
        edit={editBranch}
        orgId={orgId}
        key={editBranch?.id ?? "new"}
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
