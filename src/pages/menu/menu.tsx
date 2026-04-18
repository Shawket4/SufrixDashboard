import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { type ColumnDef } from "@tanstack/react-table";
import { Coffee, Edit2, Package, Plus, Tag, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/shared/ui/page-shell";
import { DataTable } from "@/shared/ui/data-table";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { categoryApi, menuItemApi, addonApi } from "@/entities/menu/api";
import { useCategories, useMenuItems, useAddons } from "@/entities/menu/queries";
import {
  categorySchema, menuItemSchema, addonSchema,
  type CategoryValues, type MenuItemValues, type AddonValues,
} from "@/entities/menu/schemas";
import { QUERY_KEYS } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import { fmtMoney, piastresToEgp } from "@/shared/lib/format";
import { exportToExcel } from "@/shared/lib/excel";
import type { AddonItem, Category, MenuItem } from "@/shared/types";

// ── Category Dialog ──────────────────────────────────────────────────────────
function CategoryDialog({ open, onClose, edit, orgId }: { open: boolean; onClose: () => void; edit: Category | null; orgId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: edit?.name ?? "",
      display_order: edit?.display_order ?? 0,
      is_active: edit?.is_active ?? true,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (v: CategoryValues) =>
      edit ? categoryApi.update(edit.id, v) : categoryApi.create({ ...v, org_id: orgId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.categories(orgId) });
      toast.success(t("common.save"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? t("menu.categoryDialog.edit") : t("menu.categoryDialog.new")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")}</FormLabel>
                    <FormControl><Input placeholder={t("menu.categoryDialog.namePh")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("menu.displayOrder")}</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

// ── Menu Item Dialog ─────────────────────────────────────────────────────────
function MenuItemDialog({
  open, onClose, edit, orgId, categories,
}: {
  open: boolean;
  onClose: () => void;
  edit: MenuItem | null;
  orgId: string;
  categories: Category[];
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const form = useForm<MenuItemValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: edit?.name ?? "",
      description: edit?.description ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      base_price: (edit ? String(edit.base_price / 100) : "") as any,
      category_id: edit?.category_id ?? "",
      is_active: edit?.is_active ?? true,
      display_order: edit?.display_order ?? 0,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (v: MenuItemValues) => {
      const payload = {
        name: v.name,
        description: v.description || null,
        base_price: v.base_price,
        category_id: v.category_id || null,
        is_active: v.is_active,
        display_order: v.display_order,
      };
      return edit ? menuItemApi.update(edit.id, payload) : menuItemApi.create({ ...payload, org_id: orgId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast.success(t("common.save"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{edit ? t("menu.itemDialog.edit") : t("menu.itemDialog.new")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")}</FormLabel>
                    <FormControl><Input placeholder={t("menu.itemDialog.namePh")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.description")}</FormLabel>
                    <FormControl><Input placeholder={t("menu.itemDialog.descPh")} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="base_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.price")} (EGP)</FormLabel>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <FormControl><Input type="number" step="0.5" {...(field as any)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.category")}</FormLabel>
                      <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">{t("menu.noCategory")}</SelectItem>
                          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 !space-y-0">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel>{t("common.active")}</FormLabel>
                  </FormItem>
                )}
              />
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

// ── Addon Dialog ─────────────────────────────────────────────────────────────
function AddonDialog({ open, onClose, edit, orgId }: { open: boolean; onClose: () => void; edit: AddonItem | null; orgId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const form = useForm<AddonValues>({
    resolver: zodResolver(addonSchema),
    defaultValues: {
      name: edit?.name ?? "",
      addon_type: edit?.addon_type ?? "extra",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default_price: (edit ? String(edit.default_price / 100) : "") as any,
      display_order: edit?.display_order ?? 0,
      is_active: edit?.is_active ?? true,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (v: AddonValues) =>
      edit
        ? addonApi.update(edit.id, v)
        : addonApi.create({ ...v, org_id: orgId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addons"] });
      toast.success(t("common.save"));
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? t("menu.addonDialog.edit") : t("menu.addonDialog.new")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))}>
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")}</FormLabel>
                    <FormControl><Input placeholder={t("menu.addonDialog.namePh")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="addon_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("menu.addonDialog.typeLabel")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="coffee_type">{t("menu.addonTypes.coffee_type")}</SelectItem>
                          <SelectItem value="milk_type">{t("menu.addonTypes.milk_type")}</SelectItem>
                          <SelectItem value="extra">{t("menu.addonTypes.extra")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="default_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("menu.addonDialog.defaultPrice")}</FormLabel>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <FormControl><Input type="number" step="0.5" {...(field as any)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("menu.displayOrder")}</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Menu() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { orgId } = useCurrentContext();
  const [tab, setTab] = useState<"items" | "categories" | "addons">("items");

  const [catDlg, setCatDlg] = useState(false);
  const [itemDlg, setItemDlg] = useState(false);
  const [addonDlg, setAddonDlg] = useState(false);

  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editAddon, setEditAddon] = useState<AddonItem | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<
    { kind: "cat"; id: string; name: string } | { kind: "item"; id: string; name: string } | { kind: "addon"; id: string; name: string } | null
  >(null);

  const [selCat, setSelCat] = useState<string | "all">("all");
  const [selType, setSelType] = useState<string | "all">("all");

  const { data: categories = [], isLoading: catsLoading } = useCategories(orgId);
  const { data: items = [], isLoading: itemsLoading } = useMenuItems(orgId, selCat === "all" ? null : selCat);
  const { data: addons = [], isLoading: addonsLoading } = useAddons(orgId, selType === "all" ? null : selType);

  const toggleItem = useMutation({
    mutationFn: (it: MenuItem) => menuItemApi.update(it.id, { is_active: !it.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleAddon = useMutation({
    mutationFn: (a: AddonItem) => addonApi.update(a.id, { is_active: !a.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addons"] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (c: NonNullable<typeof confirmDelete>) =>
      c.kind === "cat" ? categoryApi.remove(c.id) : c.kind === "item" ? menuItemApi.remove(c.id) : addonApi.remove(c.id),
    onSuccess: (_, c) => {
      qc.invalidateQueries({ queryKey: c.kind === "cat" ? ["categories"] : c.kind === "item" ? ["menu-items"] : ["addons"] });
      toast.success(t("common.delete"));
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const itemCols: ColumnDef<MenuItem>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: t("common.name"),
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-sm">{row.original.name}</p>
          {row.original.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "base_price",
      header: t("common.price"),
      cell: ({ row }) => <span className="font-semibold tabular">{fmtMoney(row.original.base_price)}</span>,
    },
    {
      accessorKey: "category_id",
      header: t("common.category"),
      cell: ({ row }) => {
        const cat = categories.find((c) => c.id === row.original.category_id);
        return cat ? <Badge variant="outline">{cat.name}</Badge> : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      accessorKey: "is_active",
      header: t("common.active"),
      cell: ({ row }) => (
        <button onClick={(e) => { e.stopPropagation(); toggleItem.mutate(row.original); }}>
          {row.original.is_active ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} className="text-muted-foreground" />}
        </button>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="iconSm" onClick={() => { setEditItem(row.original); setItemDlg(true); }}>
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => setConfirmDelete({ kind: "item", id: row.original.id, name: row.original.name })}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ], [categories, t, toggleItem]);

  const catCols: ColumnDef<Category>[] = useMemo(() => [
    { accessorKey: "name", header: t("common.name"), cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
    { accessorKey: "display_order", header: t("menu.displayOrder") },
    {
      accessorKey: "is_active",
      header: t("common.status"),
      cell: ({ row }) => <Badge variant={row.original.is_active ? "success" : "outline"}>{row.original.is_active ? t("common.active") : t("common.inactive")}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="iconSm" onClick={() => { setEditCat(row.original); setCatDlg(true); }}>
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => setConfirmDelete({ kind: "cat", id: row.original.id, name: row.original.name })}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ], [t]);

  const addonCols: ColumnDef<AddonItem>[] = useMemo(() => [
    { accessorKey: "name", header: t("common.name"), cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
    {
      accessorKey: "addon_type",
      header: t("common.type"),
      cell: ({ row }) => (
        <Badge variant="info">
          {t(`menu.addonTypes.${row.original.addon_type}`, { defaultValue: row.original.addon_type })}
        </Badge>
      ),
    },
    { accessorKey: "default_price", header: t("common.price"), cell: ({ row }) => <span className="tabular">{fmtMoney(row.original.default_price)}</span> },
    {
      accessorKey: "is_active",
      header: t("common.active"),
      cell: ({ row }) => (
        <button onClick={(e) => { e.stopPropagation(); toggleAddon.mutate(row.original); }}>
          {row.original.is_active ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} className="text-muted-foreground" />}
        </button>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="iconSm" onClick={() => { setEditAddon(row.original); setAddonDlg(true); }}>
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => setConfirmDelete({ kind: "addon", id: row.original.id, name: row.original.name })}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ], [t, toggleAddon]);

  const handleExport = () =>
    exportToExcel({
      filename: "Menu",
      sheets: [
        {
          name: "Items",
          title: t("menu.items"),
          columns: [
            { key: "name", header: t("common.name"), accessor: (m: MenuItem) => m.name, width: 28 },
            { key: "description", header: t("common.description"), accessor: (m: MenuItem) => m.description ?? "—", width: 32 },
            { key: "category", header: t("common.category"), accessor: (m: MenuItem) => categories.find((c) => c.id === m.category_id)?.name ?? t("menu.uncategorised"), width: 20 },
            { key: "price", header: t("common.price"), accessor: (m: MenuItem) => m.base_price, type: "money", width: 14, total: true },
            { key: "is_active", header: t("common.status"), accessor: (m: MenuItem) => m.is_active, type: "bool", width: 12 },
          ],
          rows: items,
          totals: true,
          stats: [
            { label: t("common.total"), value: items.length, type: "number" },
            { label: t("common.active"), value: items.filter((i) => i.is_active).length, type: "number", color: "FF16A34A" },
            { label: "Avg", value: items.length ? piastresToEgp(items.reduce((s, i) => s + i.base_price, 0) / items.length) : 0, type: "money" },
          ],
        },
        {
          name: "Categories",
          title: t("menu.categories"),
          columns: [
            { key: "name", header: t("common.name"), accessor: (c: Category) => c.name, width: 28 },
            { key: "order", header: t("menu.displayOrder"), accessor: (c: Category) => c.display_order, type: "integer", width: 14 },
            { key: "is_active", header: t("common.status"), accessor: (c: Category) => c.is_active, type: "bool", width: 12 },
          ],
          rows: categories,
        },
        {
          name: "Addons",
          title: t("menu.addons"),
          columns: [
            { key: "name", header: t("common.name"), accessor: (a: AddonItem) => a.name, width: 28 },
            { key: "type", header: t("common.type"), accessor: (a: AddonItem) => t(`menu.addonTypes.${a.addon_type}`, { defaultValue: a.addon_type }), width: 18 },
            { key: "price", header: t("common.price"), accessor: (a: AddonItem) => a.default_price, type: "money", width: 14, total: true },
            { key: "order", header: t("menu.displayOrder"), accessor: (a: AddonItem) => a.display_order, type: "integer", width: 14 },
            { key: "is_active", header: t("common.status"), accessor: (a: AddonItem) => a.is_active, type: "bool", width: 12 },
          ],
          rows: addons,
          totals: true,
        },
      ],
    });

  if (!orgId) return <PageShell title={t("menu.title")} description={t("menu.subtitle")}>{null}</PageShell>;

  return (
    <PageShell
      title={t("menu.title")}
      description={t("menu.subtitle")}
      action={
        <Button variant="outline" size="sm" onClick={handleExport} disabled={items.length + categories.length + addons.length === 0}>
          {t("common.export")}
        </Button>
      }
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList>
          <TabsTrigger value="items"><Coffee size={14} /> {t("menu.itemsCount", { count: items.length })}</TabsTrigger>
          <TabsTrigger value="categories"><Tag size={14} /> {t("menu.categoriesCount", { count: categories.length })}</TabsTrigger>
          <TabsTrigger value="addons"><Package size={14} /> {t("menu.addonsCount", { count: addons.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <Select value={selCat} onValueChange={setSelCat}>
              <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("menu.allCategories")}</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="ms-auto" onClick={() => { setEditItem(null); setItemDlg(true); }}>
              <Plus /> {t("menu.addItem")}
            </Button>
          </div>
          {itemsLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState icon={Coffee} title={t("menu.emptyItems")} />
          ) : (
            <DataTable columns={itemCols} data={items} searchKey="name" searchPlaceholder={t("menu.searchItems")} onRowClick={(it) => { setEditItem(it); setItemDlg(true); }} />
          )}
        </TabsContent>

        <TabsContent value="categories">
          <div className="mb-4 flex">
            <Button size="sm" className="ms-auto" onClick={() => { setEditCat(null); setCatDlg(true); }}>
              <Plus /> {t("menu.addCategory")}
            </Button>
          </div>
          {catsLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : categories.length === 0 ? (
            <EmptyState icon={Tag} title={t("menu.emptyCategories")} />
          ) : (
            <DataTable columns={catCols} data={categories} searchKey="name" searchPlaceholder={t("menu.searchCategories")} />
          )}
        </TabsContent>

        <TabsContent value="addons">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <Select value={selType} onValueChange={setSelType}>
              <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("menu.allTypes")}</SelectItem>
                <SelectItem value="coffee_type">{t("menu.addonTypes.coffee_type")}</SelectItem>
                <SelectItem value="milk_type">{t("menu.addonTypes.milk_type")}</SelectItem>
                <SelectItem value="extra">{t("menu.addonTypes.extra")}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="ms-auto" onClick={() => { setEditAddon(null); setAddonDlg(true); }}>
              <Plus /> {t("menu.addAddon")}
            </Button>
          </div>
          {addonsLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : addons.length === 0 ? (
            <EmptyState icon={Package} title={t("menu.emptyAddons")} />
          ) : (
            <DataTable columns={addonCols} data={addons} searchKey="name" searchPlaceholder={t("menu.searchAddons")} />
          )}
        </TabsContent>
      </Tabs>

      <CategoryDialog open={catDlg} onClose={() => { setCatDlg(false); setEditCat(null); }} edit={editCat} orgId={orgId} key={`cat-${editCat?.id ?? "new"}`} />
      <MenuItemDialog open={itemDlg} onClose={() => { setItemDlg(false); setEditItem(null); }} edit={editItem} orgId={orgId} categories={categories} key={`item-${editItem?.id ?? "new"}`} />
      <AddonDialog open={addonDlg} onClose={() => { setAddonDlg(false); setEditAddon(null); }} edit={editAddon} orgId={orgId} key={`addon-${editAddon?.id ?? "new"}`} />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("common.confirmDelete", { name: confirmDelete?.name ?? "" })}
        destructive
        loading={remove.isPending}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
      />
    </PageShell>
  );
}
