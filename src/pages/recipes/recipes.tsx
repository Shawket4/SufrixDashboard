import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { BookOpen, Coffee, Info, Package, Plus, Settings2, Sliders, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/shared/ui/page-shell";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Card, CardContent } from "@/shared/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { EmptyState } from "@/shared/ui/empty-state";
import { SearchableSelect } from "@/shared/ui/searchable-select";
import { Skeleton } from "@/shared/ui/skeleton";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ListPicker } from "@/shared/ui/list-picker";
import {
  Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { recipeApi } from "@/entities/recipe/api";
import { useAddonRecipes } from "@/entities/recipe/queries";
import { useMenuItems, useMenuItem, useAddons, useSlots, useOptionals } from "@/entities/menu/queries";
import { slotApi, optionalApi } from "@/entities/menu/api";
import { useCatalog } from "@/entities/inventory/queries";
import { drinkRecipeSchema, addonRecipeSchema, type DrinkRecipeValues, type AddonRecipeValues } from "@/entities/recipe/schemas";
import { slotSchema, optionalSchema, type SlotValues, type OptionalValues } from "@/entities/menu/schemas";
import { QUERY_KEYS } from "@/shared/config/constants";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { getErrorMessage } from "@/shared/api/errors";
import { fmtUnit } from "@/shared/lib/format";
import type { AddonIngredient, AddonItem, MenuItem, MenuItemEmbeddedRecipe } from "@/shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Drinks Tab
// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: reads recipes from GET /menu-items/:id (`fullItem.recipes`)
// instead of hitting /recipes/drinks/:id separately. The detail endpoint
// already embeds them — one round-trip, no race conditions.
function DrinksTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selItemId, setSelItemId] = useState<string | null>(null);
  const [dlg, setDlg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MenuItemEmbeddedRecipe | null>(null);

  const { data: items = [] } = useMenuItems(orgId);
  const { data: fullItem, isLoading } = useMenuItem(selItemId);
  const { data: catalog = [] } = useCatalog(orgId);

  const recipes = fullItem?.recipes ?? [];

  // Size resolution:
  //   - If the item defines explicit sizes, use those labels.
  //   - Otherwise fall back to "one_size" (what the backend actually emits for
  //     size-less drinks; older code used "Regular" which matched nothing).
  //   - Defensive: union in any size_label appearing in recipes but not
  //     declared, so data never silently disappears.
  const sizes = useMemo<string[]>(() => {
    const declared = (fullItem?.sizes ?? []).map((s) => s.label);
    const inRecipes = Array.from(new Set(recipes.map((r) => r.size_label)));
    if (declared.length === 0 && inRecipes.length === 0) return ["one_size"];
    const union = Array.from(new Set([...declared, ...inRecipes]));
    return union.length > 0 ? union : ["one_size"];
  }, [fullItem?.sizes, recipes]);

  const form = useForm<DrinkRecipeValues>({
    resolver: zodResolver(drinkRecipeSchema),
    defaultValues: {
      size_label: sizes[0] ?? "one_size",
      org_ingredient_id: null,
      ingredient_name: "",
      ingredient_unit: "g",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      quantity_used: 0 as any,
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.menuItem(selItemId ?? "") });
  };

  const save = useMutation({
    mutationFn: (v: DrinkRecipeValues) => recipeApi.upsertDrink(selItemId!, v),
    onSuccess: () => {
      invalidate();
      toast.success(t("recipes.ingredientSaved"));
      setDlg(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (r: MenuItemEmbeddedRecipe) =>
      recipeApi.removeDrink(selItemId!, r.size_label, r.ingredient_name),
    onSuccess: () => {
      invalidate();
      toast.success(t("recipes.ingredientRemoved"));
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const bySize = useMemo(() => {
    const m = new Map<string, MenuItemEmbeddedRecipe[]>();
    sizes.forEach((s) => m.set(s, []));
    recipes.forEach((r) => {
      const arr = m.get(r.size_label) ?? [];
      arr.push(r);
      m.set(r.size_label, arr);
    });
    return m;
  }, [recipes, sizes]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <ListPicker
        heading={t("recipes.selectDrink")}
        items={items.map((it: MenuItem) => ({
          id: it.id,
          label: it.name,
          sublabel: it.description ?? null,
        }))}
        selectedId={selItemId}
        onSelect={setSelItemId}
        searchPlaceholder={t("menu.searchItems")}
        emptyLabel={t("menu.emptyItems")}
      />

      <div className="rounded-xl border bg-card overflow-hidden">
        {!selItemId ? (
          <EmptyState icon={Coffee} title={t("recipes.selectDrink")} description={t("recipes.selectDrinkHint")} className="h-[600px]" />
        ) : (
          <>
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-bold">{fullItem?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{sizes.length} size(s)</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  form.reset({
                    size_label: sizes[0] ?? "one_size",
                    org_ingredient_id: null,
                    ingredient_name: "",
                    ingredient_unit: "g",
                    quantity_used: 0 as unknown as number,
                  });
                  setDlg(true);
                }}
              >
                <Plus /> {t("recipes.addIngredient")}
              </Button>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {sizes.map((size) => {
                  const rs = bySize.get(size) ?? [];
                  return (
                    <div key={size}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="info">{size}</Badge>
                        <div className="h-px bg-border flex-1" />
                        <span className="text-xs text-muted-foreground">{rs.length} ingredient(s)</span>
                      </div>
                      {rs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 ps-4">{t("recipes.noIngredients")}</p>
                      ) : (
                        <div className="space-y-1">
                          {rs.map((r) => (
                            <div
                              key={`${r.size_label}-${r.ingredient_name}`}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{r.ingredient_name}</p>
                                <p className="text-xs text-muted-foreground tabular">
                                  {Number(r.quantity_used).toFixed(3)} {fmtUnit(r.ingredient_unit)}
                                </p>
                              </div>
                              <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => setConfirmDelete(r)}>
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("recipes.addIngredient")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
              <DialogBody>
                <FormField control={form.control} name="size_label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipes.size")}</FormLabel>
                    <select
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="org_ingredient_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipes.ingredient")}</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={catalog.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name, hint: fmtUnit(c.unit), data: c }))}
                        value={field.value ?? null}
                        onChange={(v, opt) => {
                          field.onChange(v);
                          if (opt?.data) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const ing = opt.data as any;
                            form.setValue("ingredient_name", ing.name);
                            form.setValue("ingredient_unit", ing.unit);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantity_used" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.qty")} ({form.watch("ingredient_unit") ? fmtUnit(form.watch("ingredient_unit")) : ""})</FormLabel>
                    <FormControl><Input type="number" step="0.001" min="0.001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
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
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("common.confirmDelete", { name: confirmDelete?.ingredient_name ?? "" })}
        destructive
        loading={remove.isPending}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Addons Tab
// ─────────────────────────────────────────────────────────────────────────────
function AddonsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selAddonId, setSelAddonId] = useState<string | null>(null);
  const [dlg, setDlg] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AddonIngredient | null>(null);

  const { data: addons = [] } = useAddons(orgId);
  const { data: recipes = [], isLoading } = useAddonRecipes(selAddonId);
  const { data: catalog = [] } = useCatalog(orgId);

  const form = useForm<AddonRecipeValues>({
    resolver: zodResolver(addonRecipeSchema),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: { org_ingredient_id: null, ingredient_name: "", unit: "g", quantity_used: 0 as any },
  });

  const save = useMutation({
    mutationFn: (v: AddonRecipeValues) => recipeApi.upsertAddon(selAddonId!, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.addonRecipes(selAddonId ?? "") });
      toast.success(t("recipes.ingredientSaved"));
      setDlg(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (r: AddonIngredient) => recipeApi.removeAddon(selAddonId!, r.ingredient_name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.addonRecipes(selAddonId ?? "") });
      toast.success(t("recipes.ingredientRemoved"));
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <ListPicker
        heading={t("recipes.selectAddon")}
        items={addons.map((a: AddonItem) => ({
          id: a.id,
          label: a.name,
          sublabel: t(`menu.addonTypes.${a.addon_type}`, { defaultValue: a.addon_type }),
        }))}
        selectedId={selAddonId}
        onSelect={setSelAddonId}
        searchPlaceholder={t("menu.searchAddons")}
        emptyLabel={t("menu.emptyAddons")}
      />

      <div className="rounded-xl border bg-card overflow-hidden">
        {!selAddonId ? (
          <EmptyState icon={Package} title={t("recipes.selectAddon")} description={t("recipes.selectAddonHint")} className="h-[600px]" />
        ) : (
          <>
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-3">
              <p className="font-bold">{addons.find((a) => a.id === selAddonId)?.name}</p>
              <Button size="sm" onClick={() => { form.reset(); setDlg(true); }}><Plus /> {t("recipes.addIngredient")}</Button>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : recipes.length === 0 ? (
              <EmptyState icon={Package} title={t("recipes.noIngredients")} className="py-12" />
            ) : (
              <div className="p-4 space-y-1 max-h-[520px] overflow-y-auto">
                {recipes.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.ingredient_name}</p>
                      <p className="text-xs text-muted-foreground tabular">{Number(r.quantity_used).toFixed(3)} {fmtUnit(r.unit)}</p>
                    </div>
                    <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => setConfirmDelete(r)}><Trash2 size={12} /></Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("recipes.addIngredient")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => save.mutate(v))}>
              <DialogBody>
                <FormField control={form.control} name="org_ingredient_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipes.ingredient")}</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={catalog.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name, hint: fmtUnit(c.unit), data: c }))}
                        value={field.value ?? null}
                        onChange={(v, opt) => {
                          field.onChange(v);
                          if (opt?.data) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const ing = opt.data as any;
                            form.setValue("ingredient_name", ing.name);
                            form.setValue("unit", ing.unit);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantity_used" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.qty")} ({form.watch("unit") ? fmtUnit(form.watch("unit")) : ""})</FormLabel>
                    <FormControl><Input type="number" step="0.001" min="0.001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
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
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("common.confirmDelete", { name: confirmDelete?.ingredient_name ?? "" })}
        destructive
        loading={remove.isPending}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Slots & Optionals Tab
// ─────────────────────────────────────────────────────────────────────────────
function SlotsOptionalsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selItemId, setSelItemId] = useState<string | null>(null);

  const { data: items = [] } = useMenuItems(orgId);
  const { data: slots = [] } = useSlots(selItemId);
  const { data: optionals = [] } = useOptionals(selItemId);
  const { data: catalog = [] } = useCatalog(orgId);

  const [slotDlg, setSlotDlg] = useState(false);
  const slotForm = useForm<SlotValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: { addon_type: "", label: "", is_required: false, min_selections: 0, max_selections: null, display_order: 0 },
  });

  const saveSlot = useMutation({
    mutationFn: (v: SlotValues) =>
      slotApi.create(selItemId!, {
        addon_type: v.addon_type,
        label: v.label || null,
        is_required: v.is_required,
        min_selections: v.min_selections,
        max_selections: v.max_selections ?? null,
        display_order: v.display_order,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.slots(selItemId ?? "") });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.menuItem(selItemId ?? "") });
      toast.success(t("recipes.slots.saved"));
      setSlotDlg(false);
      slotForm.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeSlot = useMutation({
    mutationFn: (slotId: string) => slotApi.remove(selItemId!, slotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.slots(selItemId ?? "") });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.menuItem(selItemId ?? "") });
      toast.success(t("recipes.slots.removed"));
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const [optDlg, setOptDlg] = useState(false);
  const optForm = useForm<OptionalValues>({
    resolver: zodResolver(optionalSchema),
    defaultValues: { name: "", org_ingredient_id: null, ingredient_name: null, ingredient_unit: null, quantity_used: null, is_active: true },
  });

  const saveOpt = useMutation({
    mutationFn: (v: OptionalValues) =>
      optionalApi.upsert(selItemId!, {
        name: v.name,
        org_ingredient_id: v.org_ingredient_id ?? null,
        ingredient_name: v.ingredient_name ?? null,
        ingredient_unit: v.ingredient_unit ?? null,
        quantity_used: v.quantity_used ?? null,
        is_active: v.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.optionals(selItemId ?? "") });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.menuItem(selItemId ?? "") });
      toast.success(t("common.save"));
      setOptDlg(false);
      optForm.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeOpt = useMutation({
    mutationFn: (fieldId: string) => optionalApi.remove(selItemId!, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.optionals(selItemId ?? "") });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.menuItem(selItemId ?? "") });
      toast.success(t("common.delete"));
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <ListPicker
        heading={t("recipes.selectDrink")}
        items={items.map((it: MenuItem) => ({ id: it.id, label: it.name, sublabel: it.description ?? null }))}
        selectedId={selItemId}
        onSelect={setSelItemId}
        searchPlaceholder={t("menu.searchItems")}
        emptyLabel={t("menu.emptyItems")}
      />

      <div className="space-y-4">
        {!selItemId ? (
          <div className="rounded-xl border bg-card">
            <EmptyState icon={Sliders} title={t("recipes.selectDrink")} description={t("recipes.selectDrinkHint")} className="h-[600px]" />
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <p className="font-bold flex items-center gap-2"><Sliders size={14} /> {t("recipes.slots.title")}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-lg">{t("recipes.slots.info")}</p>
                  </div>
                  <Button size="sm" onClick={() => { slotForm.reset(); setSlotDlg(true); }}><Plus /> {t("recipes.slots.addSlot")}</Button>
                </div>
                {slots.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">{t("recipes.slots.empty")}</p>
                ) : (
                  <div className="p-4 space-y-2">
                    {slots.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{s.label ?? t(`menu.addonTypes.${s.addon_type}`, { defaultValue: s.addon_type })}</p>
                          <p className="text-xs text-muted-foreground">
                            {t(`menu.addonTypes.${s.addon_type}`, { defaultValue: s.addon_type })} · min {s.min_selections}, max {s.max_selections ?? "∞"}
                          </p>
                        </div>
                        <Badge variant={s.is_required ? "destructive" : "outline"}>{s.is_required ? t("recipes.slots.required") : t("recipes.slots.optional")}</Badge>
                        <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => removeSlot.mutate(s.id)}><Trash2 size={12} /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <p className="font-bold flex items-center gap-2"><Settings2 size={14} /> {t("recipes.optionals.title")}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-lg">{t("recipes.optionals.info")}</p>
                  </div>
                  <Button size="sm" onClick={() => { optForm.reset(); setOptDlg(true); }}><Plus /> {t("recipes.optionals.addField")}</Button>
                </div>
                {optionals.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">{t("recipes.optionals.empty")}</p>
                ) : (
                  <div className="p-4 space-y-2">
                    {optionals.map((o) => (
                      <div key={o.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{o.name}</p>
                          {o.ingredient_name && (
                            <p className="text-xs text-muted-foreground">
                              {t("recipes.optionals.deducts", {
                                qty: Number(o.quantity_used ?? 0).toFixed(3),
                                unit: fmtUnit(o.ingredient_unit ?? ""),
                                name: o.ingredient_name,
                              })}
                            </p>
                          )}
                        </div>
                        <Badge variant={o.is_active ? "success" : "outline"}>{o.is_active ? t("common.active") : t("common.inactive")}</Badge>
                        <Button variant="ghost" size="iconSm" className="text-destructive" onClick={() => removeOpt.mutate(o.id)}><Trash2 size={12} /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={slotDlg} onOpenChange={setSlotDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("recipes.slots.addSlot")}</DialogTitle></DialogHeader>
          <Form {...slotForm}>
            <form onSubmit={slotForm.handleSubmit((v) => saveSlot.mutate(v))}>
              <DialogBody>
                <FormField control={slotForm.control} name="addon_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipes.slots.addonType")}</FormLabel>
                    <FormControl><Input placeholder="coffee_type / milk_type / extra / sweetener" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={slotForm.control} name="label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recipes.slots.displayLabel")}</FormLabel>
                    <FormControl><Input placeholder={t("recipes.slots.labelPh")} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={slotForm.control} name="min_selections" render={({ field }) => (
                    <FormItem><FormLabel>{t("recipes.slots.minSelections")}</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={slotForm.control} name="max_selections" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("recipes.slots.maxSelections")}</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} placeholder={t("recipes.slots.maxHint")} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={slotForm.control} name="is_required" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg bg-muted p-3 !space-y-0">
                    <div><FormLabel>{t("recipes.slots.required")}</FormLabel><p className="text-xs text-muted-foreground">{t("recipes.slots.requiredHint")}</p></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSlotDlg(false)}>{t("common.cancel")}</Button>
                <Button type="submit" loading={saveSlot.isPending}>{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={optDlg} onOpenChange={setOptDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("recipes.optionals.addField")}</DialogTitle></DialogHeader>
          <Form {...optForm}>
            <form onSubmit={optForm.handleSubmit((v) => saveOpt.mutate(v))}>
              <DialogBody>
                <FormField control={optForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t("recipes.optionals.checkboxLabel")}</FormLabel><FormControl><Input placeholder={t("recipes.optionals.labelPh")} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="rounded-lg bg-muted/40 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info size={12} /> {t("common.optional")} — {t("recipes.optionals.inventoryItem")}
                  </div>
                  <FormField control={optForm.control} name="org_ingredient_id" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <SearchableSelect
                          allowClear
                          options={catalog.filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name, hint: fmtUnit(c.unit), data: c }))}
                          value={field.value ?? null}
                          onChange={(v, opt) => {
                            field.onChange(v);
                            if (opt?.data) {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const ing = opt.data as any;
                              optForm.setValue("ingredient_name", ing.name);
                              optForm.setValue("ingredient_unit", ing.unit);
                            } else {
                              optForm.setValue("ingredient_name", null);
                              optForm.setValue("ingredient_unit", null);
                              optForm.setValue("quantity_used", null);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {optForm.watch("org_ingredient_id") && (
                    <FormField control={optForm.control} name="quantity_used" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.qty")} ({fmtUnit(optForm.watch("ingredient_unit") ?? "")})</FormLabel>
                        <FormControl><Input type="number" step="0.001" min="0" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOptDlg(false)}>{t("common.cancel")}</Button>
                <Button type="submit" loading={saveOpt.isPending}>{t("recipes.optionals.saveField")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
export default function Recipes() {
  const { t } = useTranslation();
  const { orgId } = useCurrentContext();
  const [tab, setTab] = useState<"drinks" | "addons" | "slots">("drinks");

  if (!orgId) return <PageShell title={t("recipes.title")} description={t("recipes.subtitle")}>{null}</PageShell>;

  return (
    <PageShell title={t("recipes.title")} description={t("recipes.subtitle")}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList>
          <TabsTrigger value="drinks"><BookOpen size={14} /> {t("recipes.tabs.drinks")}</TabsTrigger>
          <TabsTrigger value="addons"><Package size={14} /> {t("recipes.tabs.addons")}</TabsTrigger>
          <TabsTrigger value="slots"><Sliders size={14} /> {t("recipes.tabs.slotsOptionals")}</TabsTrigger>
        </TabsList>
        <TabsContent value="drinks"><DrinksTab orgId={orgId} /></TabsContent>
        <TabsContent value="addons"><AddonsTab orgId={orgId} /></TabsContent>
        <TabsContent value="slots"><SlotsOptionalsTab orgId={orgId} /></TabsContent>
      </Tabs>
    </PageShell>
  );
}
