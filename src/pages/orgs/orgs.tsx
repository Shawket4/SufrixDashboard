import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { type ColumnDef } from "@tanstack/react-table";
import { Building2, CheckCircle, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/shared/ui/page-shell";
import { DataTable } from "@/shared/ui/data-table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { StatCard } from "@/shared/ui/stat-card";
import { orgApi } from "@/entities/org/api";
import { useOrgs } from "@/entities/org/queries";
import { orgSchema, type OrgValues } from "@/entities/org/schemas";
import { QUERY_KEYS } from "@/shared/config/constants";
import { getErrorMessage } from "@/shared/api/errors";
import { exportToExcel } from "@/shared/lib/excel";
import type { Org } from "@/shared/types";

function OrgDialog({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Org | null }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const form = useForm<OrgValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: edit?.name ?? "",
      slug: edit?.slug ?? "",
      currency_code: edit?.currency_code ?? "EGP",
      tax_rate: edit?.tax_rate ?? 0,
      receipt_footer: edit?.receipt_footer ?? "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (v: OrgValues) => (edit ? orgApi.update(edit.id, v) : orgApi.create(v)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.orgs });
      toast.success(edit ? t("orgs.updatedToast") : t("orgs.createdToast"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? t("orgs.editTitle") : t("orgs.newTitle")}</DialogTitle>
          <DialogDescription>{edit ? null : t("orgs.subtitle")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("orgs.orgName")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!edit) {
                            const s = e.target.value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                            form.setValue("slug", s);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("orgs.slug")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="currency_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("orgs.currency")}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("orgs.taxRate")}</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="receipt_footer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("orgs.receiptFooter")}</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
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

export default function Orgs() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const { data: orgs = [], isLoading } = useOrgs();

  const columns: ColumnDef<Org>[] = [
    {
      accessorKey: "name",
      header: t("common.name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center text-white font-bold text-xs">
            {row.original.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.slug}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: "currency_code", header: t("orgs.currency"), cell: ({ getValue }) => <Badge variant="outline" className="font-mono">{getValue() as string}</Badge> },
    { accessorKey: "tax_rate", header: t("orgs.taxRate"), cell: ({ getValue }) => <span className="font-mono text-sm">{getValue() as number}%</span> },
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
  ];

  const handleExport = () =>
    exportToExcel({
      filename: "Organizations",
      sheets: [
        {
          name: "Organizations",
          title: t("orgs.title"),
          columns: [
            { key: "name", header: t("common.name"), accessor: (o: Org) => o.name, width: 28 },
            { key: "slug", header: t("orgs.slug"), accessor: (o: Org) => o.slug, width: 20 },
            { key: "currency_code", header: t("orgs.currency"), accessor: (o: Org) => o.currency_code, width: 12 },
            { key: "tax_rate", header: t("orgs.taxRate"), accessor: (o: Org) => o.tax_rate, type: "number", width: 12 },
            { key: "is_active", header: t("common.status"), accessor: (o: Org) => o.is_active, type: "bool", width: 12 },
          ],
          rows: orgs,
          stats: [
            { label: t("common.total"), value: orgs.length, type: "number" },
            { label: t("common.active"), value: orgs.filter((o) => o.is_active).length, type: "number", color: "FF16A34A" },
          ],
        },
      ],
    });

  return (
    <PageShell
      title={t("orgs.title")}
      description={t("orgs.subtitle")}
      action={<Button onClick={() => { setEditOrg(null); setDialogOpen(true); }}><Plus /> {t("common.new")}</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("common.total")} value={orgs.length} loading={isLoading} />
        <StatCard label={t("common.active")} value={orgs.filter((o) => o.is_active).length} loading={isLoading} accent="success" />
        <StatCard label={t("common.inactive")} value={orgs.filter((o) => !o.is_active).length} loading={isLoading} accent="warning" />
        <StatCard
          label={t("orgs.avgTax")}
          value={orgs.length ? `${(orgs.reduce((s, o) => s + o.tax_rate, 0) / orgs.length).toFixed(1)}%` : "—"}
          loading={isLoading}
          accent="info"
        />
      </div>

      <DataTable
        columns={columns}
        data={orgs}
        isLoading={isLoading}
        searchKey="name"
        onRowClick={(o) => { setEditOrg(o); setDialogOpen(true); }}
        onExport={handleExport}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-4">
            <Building2 size={32} className="text-muted-foreground/40" />
            <p>{t("common.noResults")}</p>
          </div>
        }
      />

      <OrgDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditOrg(null); }}
        edit={editOrg}
        key={editOrg?.id ?? "new"}
      />
    </PageShell>
  );
}
