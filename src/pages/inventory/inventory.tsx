import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle, ArrowLeftRight, Boxes, ClipboardList, Edit2, Package,
  Plus, RotateCcw, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/shared/ui/page-shell";
import { DataTable } from "@/shared/ui/data-table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { SearchableSelect } from "@/shared/ui/searchable-select";
import { Skeleton } from "@/shared/ui/skeleton";
import { inventoryApi } from "@/entities/inventory/api";
import { useCatalog, useBranchStock, useAdjustments, useTransfers } from "@/entities/inventory/queries";
import { useBranches } from "@/entities/branch/queries";
import {
  catalogSchema, addStockSchema, adjustmentSchema, transferSchema,
  type CatalogValues, type AddStockValues, type AdjustmentValues, type TransferValues,
} from "@/entities/inventory/schemas";
import { INVENTORY_UNITS, QUERY_KEYS } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import { fmtDateTime, fmtUnit } from "@/shared/lib/format";
import { exportToExcel } from "@/shared/lib/excel";
import type {
  BranchInventoryAdjustment, BranchInventoryItem, BranchInventoryTransfer, OrgIngredient,
} from "@/shared/types";

// ── Catalog Tab ──────────────────────────────────────────────────────────────
function CatalogTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useCatalog(orgId);
  const [dlg, setDlg] = useState(false);
  const [edit, setEdit] = useState<OrgIngredient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrgIngredient | null>(null);

  const form = useForm<CatalogValues>({
    resolver: zodResolver(catalogSchema),
    defaultValues: {
      name: "", unit: "kg", category: "general", description: "", cost_per_unit: 0, is_active: true,
    },
  });

  const openEdit = (i: OrgIngredient | null) => {
    setEdit(i);
    form.reset({
      name: i?.name ?? "",
      unit: i?.unit ?? "kg",
      category: i?.category ?? "general",
      description: i?.description ?? "",
      cost_per_unit: i?.cost_per_unit ?? 0,
      is_active: i?.is_active ?? true,
    });
    setDlg(true);
  };

  const save = useMutation({
    mutationFn: (v: CatalogValues) =>
      edit
        ? inventoryApi.updateCatalog(orgId, edit.id, v)
        : inventoryApi.createCatalog(orgId, {
            name: v.name, unit: v.unit, category: v.category,
            description: v.description || undefined, cost_per_unit: v.cost_per_unit,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.catalog(orgId) });
      toast.success(t("common.save"));
      setDlg(false);
      setEdit(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => inventoryApi.removeCatalog(orgId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.catalog(orgId) });
      toast.success(t("common.delete"));
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const cols: ColumnDef<OrgIngredient>[] = [
    {
      accessorKey: "name",
      header: t("common.name"),
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-sm">{row.original.name}</p>
          {row.original.description && <p className="text-xs text-muted-foreground">{row.original.description}</p>}
          {row.original.category && row.original.category !== "general" && (
            <Badge variant="secondary" className="mt-1">{row.original.category.replace("_", " ")}</Badge>
          )}
        </div>
      ),
    },
    { accessorKey: "unit", header: t("common.type"), cell: ({ row }) => <Badge variant="outline">{fmtUnit(row.original.unit)}</Badge> },
    {
      accessorKey: "cost_per_unit",
      header: "Cost / unit",
      cell: ({ row }) => (
        <span className="tabular text-sm">{row.original.cost_per_unit > 0 ? `${row.original.cost_per_unit} pt` : "—"}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: t("common.status"),
      cell: ({ row }) => <Badge variant={row.original.is_active ? "success" : "secondary"}>{row.original.is_active ? t("common.active") : t("common.inactive")}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="iconSm" onClick={() => openEdit(row.original)}><Edit2 size={13} /></Button>
          <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => setConfirmDelete(row.original)}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  const handleExport = () =>
    exportToExcel({
      filename: "Catalog",
      sheets: [
        {
          name: "Catalog",
          title: t("inventory.catalog.title"),
          columns: [
            { key: "name", header: t("common.name"), accessor: (i: OrgIngredient) => i.name, width: 28 },
            { key: "unit", header: "Unit", accessor: (i: OrgIngredient) => fmtUnit(i.unit), width: 10 },
            { key: "category", header: t("common.category"), accessor: (i: OrgIngredient) => i.category, width: 16 },
            { key: "cost", header: "Cost/unit (pt)", accessor: (i: OrgIngredient) => i.cost_per_unit, type: "number", width: 14 },
            { key: "is_active", header: t("common.status"), accessor: (i: OrgIngredient) => i.is_active, type: "bool", width: 12 },
          ],
          rows: items,
        },
      ],
    });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openEdit(null)}><Plus /> {t("inventory.catalog.newIngredient")}</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={t("inventory.catalog.empty")}
          description={t("inventory.catalog.emptyHint")}
          action={<Button size="sm" onClick={() => openEdit(null)}><Plus /> {t("inventory.catalog.addFirst")}</Button>}
        />
      ) : (
        <DataTable columns={cols} data={items} searchKey="name" onExport={handleExport} />
      )}

      <Dialog open={dlg} onOpenChange={(o) => !o && (setDlg(false), setEdit(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit ? edit.name : t("inventory.catalog.newIngredient")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
              <DialogBody>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t("common.name")}</FormLabel><FormControl><Input placeholder={t("inventory.catalog.namePh")} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem><FormLabel>Unit</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{INVENTORY_UNITS.map((u) => <SelectItem key={u} value={u}>{fmtUnit(u)}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>{t("common.category")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="general">{t("inventory.catalog.categoryGeneral")}</SelectItem>
                          <SelectItem value="milk">{t("inventory.catalog.categoryMilk")}</SelectItem>
                          <SelectItem value="coffee_bean">{t("inventory.catalog.categoryCoffee")}</SelectItem>
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="cost_per_unit" render={({ field }) => (
                  <FormItem><FormLabel>{t("inventory.catalog.costPerUnit")}</FormLabel><FormControl><Input type="number" step="any" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>{t("common.description")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                {edit && (
                  <FormField control={form.control} name="is_active" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 !space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>{t("common.active")}</FormLabel></FormItem>
                  )} />
                )}
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setDlg(false); setEdit(null); }}>{t("common.cancel")}</Button>
                <Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("common.confirmDelete", { name: confirmDelete?.name ?? "" })}
        destructive
        loading={remove.isPending}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      />
    </div>
  );
}

// ── Stock Tab ────────────────────────────────────────────────────────────────
function StockTab({ orgId, branchId }: { orgId: string; branchId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: stock = [], isLoading } = useBranchStock(branchId);
  const { data: catalog = [] } = useCatalog(orgId);
  const [addDlg, setAddDlg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BranchInventoryItem | null>(null);

  const form = useForm<AddStockValues>({
    resolver: zodResolver(addStockSchema),
    defaultValues: { org_ingredient_id: "", current_stock: 0, reorder_threshold: 0 },
  });

  const available = catalog.filter((c) => c.is_active && !stock.some((s) => s.org_ingredient_id === c.id));

  const add = useMutation({
    mutationFn: (v: AddStockValues) => inventoryApi.addStock(branchId, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.stock(branchId) });
      toast.success(t("inventory.stock.addedToast"));
      setAddDlg(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => inventoryApi.removeStock(branchId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.stock(branchId) });
      toast.success(t("inventory.stock.removedToast"));
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateThreshold = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      inventoryApi.updateStock(branchId, id, { reorder_threshold: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.stock(branchId) });
      toast.success(t("inventory.stock.thresholdUpdated"));
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const EditableThreshold = ({ item }: { item: BranchInventoryItem }) => {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(String(item.reorder_threshold));
    if (editing) {
      return (
        <div className="flex items-center gap-1">
          <Input type="number" value={val} step="0.001" min="0" autoFocus className="h-7 w-24 text-xs"
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { updateThreshold.mutate({ id: item.id, value: Number(val) }); setEditing(false); }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <Button size="iconSm" variant="ghost" onClick={() => { updateThreshold.mutate({ id: item.id, value: Number(val) }); setEditing(false); }}>✓</Button>
          <Button size="iconSm" variant="ghost" onClick={() => setEditing(false)}>✕</Button>
        </div>
      );
    }
    return (
      <button className="tabular text-sm hover:text-primary flex items-center gap-1" onClick={() => setEditing(true)}>
        {Number(item.reorder_threshold).toFixed(3)} <Edit2 size={11} className="opacity-50" />
      </button>
    );
  };

  const cols: ColumnDef<BranchInventoryItem>[] = [
    {
      accessorKey: "ingredient_name",
      header: t("recipes.ingredient"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.below_reorder && <AlertTriangle size={14} className="text-warning shrink-0" />}
          <div>
            <p className="font-semibold text-sm">{row.original.ingredient_name}</p>
            {row.original.description && <p className="text-xs text-muted-foreground">{row.original.description}</p>}
          </div>
        </div>
      ),
    },
    { accessorKey: "unit", header: "Unit", cell: ({ row }) => <Badge variant="outline">{fmtUnit(row.original.unit)}</Badge> },
    {
      accessorKey: "current_stock",
      header: t("inventory.stock.currentStock"),
      cell: ({ row }) => (
        <span className={`tabular font-semibold text-sm ${row.original.below_reorder ? "text-warning" : ""}`}>
          {Number(row.original.current_stock).toFixed(3)}
        </span>
      ),
    },
    { accessorKey: "reorder_threshold", header: t("inventory.stock.reorderAt"), cell: ({ row }) => <EditableThreshold item={row.original} /> },
    {
      accessorKey: "below_reorder",
      header: t("common.status"),
      cell: ({ row }) => <Badge variant={row.original.below_reorder ? "destructive" : "outline"}>{row.original.below_reorder ? t("inventory.stock.low") : t("inventory.stock.ok")}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => setConfirmDelete(row.original)}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  const handleExport = () =>
    exportToExcel({
      filename: "Branch-Stock",
      sheets: [
        {
          name: "Stock",
          title: t("inventory.stock.title"),
          columns: [
            { key: "name", header: t("recipes.ingredient"), accessor: (s: BranchInventoryItem) => s.ingredient_name, width: 28 },
            { key: "unit", header: "Unit", accessor: (s: BranchInventoryItem) => fmtUnit(s.unit), width: 10 },
            { key: "stock", header: t("inventory.stock.currentStock"), accessor: (s: BranchInventoryItem) => Number(s.current_stock), type: "number", width: 16 },
            { key: "threshold", header: t("inventory.stock.reorderAt"), accessor: (s: BranchInventoryItem) => Number(s.reorder_threshold), type: "number", width: 16 },
            { key: "low", header: t("common.status"), accessor: (s: BranchInventoryItem) => (s.below_reorder ? t("inventory.stock.low") : t("inventory.stock.ok")), width: 12 },
          ],
          rows: stock,
          stats: [
            { label: t("common.total"), value: stock.length, type: "number" },
            { label: t("dashboard.lowStock"), value: stock.filter((s) => s.below_reorder).length, color: "FFD97706", type: "number" },
          ],
        },
      ],
    });

  if (!branchId) return <EmptyState icon={Package} title={t("orders.selectBranch")} />;
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" disabled={available.length === 0} onClick={() => setAddDlg(true)}>
          <Plus /> {available.length === 0 ? t("inventory.stock.allTracked") : t("inventory.stock.addIngredient")}
        </Button>
      </div>

      {stock.length === 0 ? (
        <EmptyState icon={Package} title={t("inventory.stock.empty")} description={t("inventory.stock.emptyHint")} />
      ) : (
        <DataTable columns={cols} data={stock} searchKey="ingredient_name" onExport={handleExport} />
      )}

      <Dialog open={addDlg} onOpenChange={setAddDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("inventory.stock.addIngredient")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => add.mutate(v))}>
              <DialogBody>
                <FormField control={form.control} name="org_ingredient_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipes.ingredient")}</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={available.map((c) => ({ value: c.id, label: c.name, hint: fmtUnit(c.unit) }))}
                        value={field.value || null}
                        onChange={(v) => field.onChange(v ?? "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="current_stock" render={({ field }) => (
                  <FormItem><FormLabel>{t("inventory.stock.openingStock")}</FormLabel><FormControl><Input type="number" step="0.001" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="reorder_threshold" render={({ field }) => (
                  <FormItem><FormLabel>{t("inventory.stock.reorderThreshold")}</FormLabel><FormControl><Input type="number" step="0.001" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDlg(false)}>{t("common.cancel")}</Button>
                <Button type="submit" loading={add.isPending}>{t("common.add")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("common.confirmDelete", { name: confirmDelete?.ingredient_name ?? "" })}
        destructive
        loading={remove.isPending}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      />
    </div>
  );
}

// ── Adjustments Tab ──────────────────────────────────────────────────────────
function AdjustmentsTab({ branchId }: { branchId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: adjs = [], isLoading } = useAdjustments(branchId);
  const { data: stock = [] } = useBranchStock(branchId);
  const [dlg, setDlg] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<BranchInventoryAdjustment | null>(null);

  const form = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: { branch_inventory_id: "", adjustment_type: "add", quantity: 0 as any, note: "" },
  });

  const save = useMutation({
    mutationFn: (v: AdjustmentValues) => inventoryApi.createAdjustment(branchId, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adjustments(branchId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.stock(branchId) });
      toast.success(t("inventory.adjustments.savedToast"));
      setDlg(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reverse = useMutation({
    mutationFn: (adj: BranchInventoryAdjustment) =>
      inventoryApi.createAdjustment(branchId, {
        branch_inventory_id: adj.branch_inventory_id,
        adjustment_type: adj.adjustment_type === "add" ? "remove" : "add",
        quantity: Number(adj.quantity),
        note: `Reversal of: ${adj.note}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.adjustments(branchId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.stock(branchId) });
      toast.success(t("inventory.adjustments.reversedToast"));
      setReverseTarget(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const cols: ColumnDef<BranchInventoryAdjustment>[] = [
    {
      accessorKey: "ingredient_name",
      header: t("recipes.ingredient"),
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-sm">{row.original.ingredient_name}</p>
          <p className="text-xs text-muted-foreground">{fmtUnit(row.original.unit)}</p>
        </div>
      ),
    },
    {
      accessorKey: "adjustment_type",
      header: t("common.type"),
      cell: ({ row }) => {
        const variant = row.original.adjustment_type === "add" || row.original.adjustment_type === "transfer_in" ? "success" : "destructive";
        return <Badge variant={variant}>{t(`inventory.adjustments.types.${row.original.adjustment_type}`)}</Badge>;
      },
    },
    { accessorKey: "quantity", header: t("common.qty"), cell: ({ row }) => <span className="tabular font-semibold text-sm">{Number(row.original.quantity).toFixed(3)}</span> },
    { accessorKey: "note", header: t("common.notes"), cell: ({ row }) => <span className="text-sm text-muted-foreground max-w-[180px] truncate block">{row.original.note}</span> },
    { accessorKey: "adjusted_by_name", header: t("common.by") },
    { accessorKey: "created_at", header: t("common.date"), cell: ({ row }) => <span className="text-xs text-muted-foreground">{fmtDateTime(row.original.created_at)}</span> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const a = row.original;
        if (a.adjustment_type !== "add" && a.adjustment_type !== "remove") return null;
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="iconSm" title={t("inventory.adjustments.reverse")} onClick={() => setReverseTarget(a)}>
              <RotateCcw size={13} />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleExport = () =>
    exportToExcel({
      filename: "Adjustments",
      sheets: [
        {
          name: "Adjustments",
          title: t("inventory.adjustments.title"),
          columns: [
            { key: "ingredient", header: t("recipes.ingredient"), accessor: (a: BranchInventoryAdjustment) => a.ingredient_name, width: 24 },
            { key: "type", header: t("common.type"), accessor: (a: BranchInventoryAdjustment) => t(`inventory.adjustments.types.${a.adjustment_type}`), width: 16 },
            { key: "qty", header: t("common.qty"), accessor: (a: BranchInventoryAdjustment) => Number(a.quantity), type: "number", width: 12 },
            { key: "note", header: t("common.notes"), accessor: (a: BranchInventoryAdjustment) => a.note, width: 36 },
            { key: "by", header: t("common.by"), accessor: (a: BranchInventoryAdjustment) => a.adjusted_by_name, width: 18 },
            { key: "at", header: t("common.date"), accessor: (a: BranchInventoryAdjustment) => new Date(a.created_at), type: "dateTime", width: 20 },
          ],
          rows: adjs,
        },
      ],
    });

  if (!branchId) return <EmptyState icon={ClipboardList} title={t("orders.selectBranch")} />;
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDlg(true)}><Plus /> {t("inventory.adjustments.adjustStock")}</Button>
      </div>

      {adjs.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("inventory.adjustments.empty")} />
      ) : (
        <DataTable columns={cols} data={adjs} searchKey="ingredient_name" onExport={handleExport} />
      )}

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("inventory.adjustments.manualTitle")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
              <DialogBody>
                <FormField control={form.control} name="branch_inventory_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipes.ingredient")}</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={stock.map((s) => ({ value: s.id, label: s.ingredient_name, hint: `${Number(s.current_stock).toFixed(3)} ${fmtUnit(s.unit)}` }))}
                        value={field.value || null}
                        onChange={(v) => field.onChange(v ?? "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="adjustment_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.type")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="add">{t("inventory.adjustments.types.add")}</SelectItem>
                        <SelectItem value="remove">{t("inventory.adjustments.types.remove")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>{t("common.qty")}</FormLabel><FormControl><Input type="number" step="0.001" min="0.001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="note" render={({ field }) => (
                  <FormItem><FormLabel>{t("inventory.adjustments.note")}</FormLabel><FormControl><Input placeholder={t("inventory.adjustments.notePh")} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDlg(false)}>{t("common.cancel")}</Button>
                <Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!reverseTarget}
        onOpenChange={(o) => !o && setReverseTarget(null)}
        title={t("inventory.adjustments.reverseTitle")}
        description={t("inventory.adjustments.reverseConfirm", { note: reverseTarget?.note ?? "" })}
        loading={reverse.isPending}
        onConfirm={() => reverseTarget && reverse.mutate(reverseTarget)}
      />
    </div>
  );
}

// ── Transfers Tab ────────────────────────────────────────────────────────────
function TransfersTab({ orgId, branchId }: { orgId: string; branchId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [direction, setDirection] = useState<"all" | "incoming" | "outgoing">("all");
  const { data: transfers = [], isLoading } = useTransfers(branchId, direction === "all" ? undefined : direction);
  const { data: catalog = [] } = useCatalog(orgId);
  const { data: branches = [] } = useBranches(orgId);
  const [newDlg, setNewDlg] = useState(false);
  const [editNote, setEditNote] = useState<BranchInventoryTransfer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BranchInventoryTransfer | null>(null);
  const [noteVal, setNoteVal] = useState("");

  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: { source_branch_id: branchId, destination_branch_id: "", org_ingredient_id: "", quantity: 0 as any, note: "" },
  });

  useMemo(() => form.setValue("source_branch_id", branchId), [branchId, form]);

  const create = useMutation({
    mutationFn: (v: TransferValues) => inventoryApi.createTransfer({
      source_branch_id: v.source_branch_id,
      destination_branch_id: v.destination_branch_id,
      org_ingredient_id: v.org_ingredient_id,
      quantity: v.quantity,
      note: v.note || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transfers(branchId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.stock(branchId) });
      toast.success(t("inventory.transfers.transferredToast"));
      setNewDlg(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateNote = useMutation({
    mutationFn: () => inventoryApi.updateTransfer(editNote!.id, noteVal || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transfers(branchId) });
      toast.success(t("inventory.transfers.noteUpdatedToast"));
      setEditNote(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => inventoryApi.removeTransfer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transfers(branchId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.stock(branchId) });
      toast.success(t("inventory.transfers.reversedToast"));
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const cols: ColumnDef<BranchInventoryTransfer>[] = [
    {
      accessorKey: "ingredient_name",
      header: t("recipes.ingredient"),
      cell: ({ row }) => (
        <div><p className="font-semibold text-sm">{row.original.ingredient_name}</p><p className="text-xs text-muted-foreground">{fmtUnit(row.original.unit)}</p></div>
      ),
    },
    {
      accessorKey: "source_branch_name",
      header: t("inventory.transfers.fromBranch"),
      cell: ({ row }) => <span className={row.original.source_branch_id === branchId ? "font-semibold text-sm" : "text-muted-foreground text-sm"}>{row.original.source_branch_name}</span>,
    },
    {
      accessorKey: "destination_branch_name",
      header: t("inventory.transfers.toBranch"),
      cell: ({ row }) => <span className={row.original.destination_branch_id === branchId ? "font-semibold text-sm" : "text-muted-foreground text-sm"}>{row.original.destination_branch_name}</span>,
    },
    { accessorKey: "quantity", header: t("common.qty"), cell: ({ row }) => <span className="tabular font-semibold text-sm">{Number(row.original.quantity).toFixed(3)}</span> },
    { accessorKey: "note", header: t("common.notes"), cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.note ?? "—"}</span> },
    { accessorKey: "initiated_by_name", header: t("common.by") },
    { accessorKey: "initiated_at", header: t("common.date"), cell: ({ row }) => <span className="text-xs text-muted-foreground">{fmtDateTime(row.original.initiated_at)}</span> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="iconSm" onClick={() => { setEditNote(row.original); setNoteVal(row.original.note ?? ""); }}>
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
      filename: "Transfers",
      sheets: [
        {
          name: "Transfers",
          title: t("inventory.transfers.title"),
          columns: [
            { key: "ingredient", header: t("recipes.ingredient"), accessor: (tr: BranchInventoryTransfer) => tr.ingredient_name, width: 22 },
            { key: "from", header: t("inventory.transfers.fromBranch"), accessor: (tr: BranchInventoryTransfer) => tr.source_branch_name, width: 20 },
            { key: "to", header: t("inventory.transfers.toBranch"), accessor: (tr: BranchInventoryTransfer) => tr.destination_branch_name, width: 20 },
            { key: "qty", header: t("common.qty"), accessor: (tr: BranchInventoryTransfer) => Number(tr.quantity), type: "number", width: 12 },
            { key: "note", header: t("common.notes"), accessor: (tr: BranchInventoryTransfer) => tr.note ?? "—", width: 28 },
            { key: "by", header: t("common.by"), accessor: (tr: BranchInventoryTransfer) => tr.initiated_by_name, width: 18 },
            { key: "at", header: t("common.date"), accessor: (tr: BranchInventoryTransfer) => new Date(tr.initiated_at), type: "dateTime", width: 20 },
          ],
          rows: transfers,
        },
      ],
    });

  if (!branchId) return <EmptyState icon={ArrowLeftRight} title={t("orders.selectBranch")} />;
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-end flex-wrap">
        <Select value={direction} onValueChange={(v) => setDirection(v as "all" | "incoming" | "outgoing")}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("inventory.transfers.directionAll")}</SelectItem>
            <SelectItem value="incoming">{t("inventory.transfers.directionIncoming")}</SelectItem>
            <SelectItem value="outgoing">{t("inventory.transfers.directionOutgoing")}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setNewDlg(true)}><Plus /> {t("inventory.transfers.newTransfer")}</Button>
      </div>

      {transfers.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title={t("inventory.transfers.empty")} />
      ) : (
        <DataTable columns={cols} data={transfers} searchKey="ingredient_name" onExport={handleExport} />
      )}

      <Dialog open={newDlg} onOpenChange={setNewDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("inventory.transfers.newTransfer")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => create.mutate(v))}>
              <DialogBody>
                <FormField control={form.control} name="source_branch_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.transfers.fromBranch")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="destination_branch_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("inventory.transfers.toBranch")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {branches.filter((b) => b.id !== form.watch("source_branch_id")).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="org_ingredient_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipes.ingredient")}</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={catalog.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name, hint: fmtUnit(c.unit) }))}
                        value={field.value || null}
                        onChange={(v) => field.onChange(v ?? "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>{t("common.qty")}</FormLabel><FormControl><Input type="number" step="0.001" min="0.001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="note" render={({ field }) => (
                  <FormItem><FormLabel>{t("common.notes")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewDlg(false)}>{t("common.cancel")}</Button>
                <Button type="submit" loading={create.isPending}>{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editNote} onOpenChange={(o) => !o && setEditNote(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("inventory.transfers.editNote")}</DialogTitle></DialogHeader>
          <DialogBody>
            <Input value={noteVal} onChange={(e) => setNoteVal(e.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNote(null)}>{t("common.cancel")}</Button>
            <Button loading={updateNote.isPending} onClick={() => updateNote.mutate()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("common.confirmDelete", { name: confirmDelete?.ingredient_name ?? "" })}
        destructive
        loading={remove.isPending}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete.id)}
      />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Inventory() {
  const { t } = useTranslation();
  const { orgId, branchId: ctxBranch } = useCurrentContext();
  const { data: branches = [] } = useBranches(orgId);
  const [selBranch, setSelBranch] = useState(ctxBranch ?? "");
  const [tab, setTab] = useState<"catalog" | "stock" | "adjustments" | "transfers">("catalog");

  useMemo(() => {
    if (!selBranch && branches.length > 0) setSelBranch(branches[0].id);
  }, [branches, selBranch]);

  const active = branches.find((b) => b.id === selBranch) ?? branches[0];

  if (!orgId) return <PageShell title={t("inventory.title")} description={t("inventory.subtitle")}>{null}</PageShell>;

  return (
    <PageShell
      title={t("inventory.title")}
      description={active ? active.name : t("inventory.subtitle")}
      action={
        branches.length > 1 && (
          <Select value={selBranch} onValueChange={setSelBranch}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        )
      }
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="catalog"><Boxes size={14} /> {t("inventory.tabs.catalog")}</TabsTrigger>
          <TabsTrigger value="stock"><Package size={14} /> {t("inventory.tabs.stock")}</TabsTrigger>
          <TabsTrigger value="adjustments"><ClipboardList size={14} /> {t("inventory.tabs.adjustments")}</TabsTrigger>
          <TabsTrigger value="transfers"><ArrowLeftRight size={14} /> {t("inventory.tabs.transfers")}</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog"><CatalogTab orgId={orgId} /></TabsContent>
        <TabsContent value="stock"><StockTab orgId={orgId} branchId={active?.id ?? ""} /></TabsContent>
        <TabsContent value="adjustments"><AdjustmentsTab branchId={active?.id ?? ""} /></TabsContent>
        <TabsContent value="transfers"><TransfersTab orgId={orgId} branchId={active?.id ?? ""} /></TabsContent>
      </Tabs>
    </PageShell>
  );
}
