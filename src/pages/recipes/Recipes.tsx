import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, BookOpen, Coffee, Package, Search,
  ChevronsUpDown, Check, Settings2, Layers, AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import * as menuApi from "@/api/menu";
import * as recipesApi from "@/api/recipes";
import * as inventoryApi from "@/api/inventory";
import type {
  MenuItem, DrinkRecipe, AddonItem, AddonIngredient,
  AddonSlot, MenuItemOptionalField, OrgIngredient,
} from "@/types";
import { egp, fmtUnit, SIZE_LABELS } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { getErrorMessage } from "@/lib/client";

// ── Shared pickers ────────────────────────────────────────────

function IngredientPicker({
  items, value, onSelect, placeholder = "Select ingredient…",
}: {
  items: OrgIngredient[];
  value: string;
  onSelect: (ing: OrgIngredient) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.name === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}
          className="w-full justify-between h-8 text-xs font-normal">
          <span className="truncate">
            {selected ? `${selected.name} (${fmtUnit(selected.unit)})` : placeholder}
          </span>
          <ChevronsUpDown size={12} className="ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search ingredients…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-4 text-xs text-center text-muted-foreground">
              No ingredients found
            </CommandEmpty>
            <CommandGroup>
              {items.map((ing) => (
                <CommandItem key={ing.id} value={ing.name}
                  onSelect={() => { onSelect(ing); setOpen(false); }}
                  className="text-xs">
                  <Check size={12}
                    className={`mr-2 ${ing.name === value ? "opacity-100" : "opacity-0"}`} />
                  {ing.name}
                  <span className="ml-auto text-muted-foreground">{fmtUnit(ing.unit)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ReplacePicker removed

function AddonPicker({
  items, value, onChange, placeholder = "None",
}: {
  items: AddonItem[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}
          className="w-full justify-between h-8 text-xs font-normal">
          <span className="truncate text-muted-foreground">
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown size={12} className="ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search addon…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-4 text-xs text-center text-muted-foreground">No match</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__"
                onSelect={() => { onChange(null); setOpen(false); }}
                className="text-xs text-muted-foreground">
                <Check size={12} className={`mr-2 ${!value ? "opacity-100" : "opacity-0"}`} />
                None
              </CommandItem>
              {items.map((a) => (
                <CommandItem key={a.id} value={a.name}
                  onSelect={() => { onChange(a.id); setOpen(false); }}
                  className="text-xs">
                  <Check size={12}
                    className={`mr-2 ${a.id === value ? "opacity-100" : "opacity-0"}`} />
                  {a.name}
                  <span className="ml-auto text-muted-foreground text-[10px]">{a.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Drink Recipe Panel (unchanged) ────────────────────────────

function RecipeRow({ recipe, onDelete }: { recipe: DrinkRecipe; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{recipe.ingredient_name}</p>
        <p className="text-xs text-muted-foreground">
          {recipe.quantity_used} {fmtUnit(recipe.unit)} · {SIZE_LABELS[recipe.size_label] ?? recipe.size_label}
        </p>
      </div>
      <Button variant="ghost" size="icon-sm"
        className="opacity-0 group-hover:opacity-100 text-destructive" onClick={onDelete}>
        <Trash2 size={13} />
      </Button>
    </div>
  );
}

function DrinkRecipePanel({ item, orgId }: { item: MenuItem; orgId: string }) {
  const qc = useQueryClient();
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["drink-recipes", item.id],
    queryFn:  () => recipesApi.getDrinkRecipes(item.id).then((r) => r.data),
  });
  const { data: invItems = [] } = useQuery({
    queryKey: ["org-catalog", orgId],
    queryFn:  () => inventoryApi.getCatalog(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });
  const [form, setForm] = useState({
    size_label: "medium", org_ingredient_id: null as string | null,
    ingredient_name: "", ingredient_unit: "", quantity_used: "",
  });
  const addMutation = useMutation({
    mutationFn: () => recipesApi.upsertDrinkRecipe(item.id, {
      size_label: form.size_label, org_ingredient_id: form.org_ingredient_id,
      ingredient_name: form.ingredient_name, ingredient_unit: form.ingredient_unit,
      quantity_used: parseFloat(form.quantity_used),
    }),
    onSuccess: () => {
      toast.success("Recipe saved");
      qc.invalidateQueries({ queryKey: ["drink-recipes", item.id] });
      setForm((f) => ({ ...f, org_ingredient_id: null, ingredient_name: "", ingredient_unit: "", quantity_used: "" }));
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const delMutation = useMutation({
    mutationFn: ({ size, ingredientName }: { size: string; ingredientName: string }) =>
      recipesApi.deleteDrinkRecipe(item.id, size, ingredientName),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["drink-recipes", item.id] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const uniqueInvItems = useMemo(
    () => Array.from(new Map(invItems.map((i) => [i.name, i])).values()),
    [invItems],
  );
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        {isLoading ? <Skeleton className="h-20" />
          : recipes.length === 0
            ? <p className="text-sm text-muted-foreground py-4 text-center">No ingredients yet</p>
            : recipes.map((r) => (
                <RecipeRow key={`${r.size_label}-${r.ingredient_name}`} recipe={r}
                  onDelete={() => delMutation.mutate({ size: r.size_label, ingredientName: r.ingredient_name })} />
              ))}
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Size</Label>
          <Select value={form.size_label} onValueChange={(v) => setForm((f) => ({ ...f, size_label: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SIZE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qty</Label>
          <Input className="h-8 text-xs" type="number" step="0.1" placeholder="e.g. 200"
            value={form.quantity_used}
            onChange={(e) => setForm((f) => ({ ...f, quantity_used: e.target.value }))} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Ingredient</Label>
          <IngredientPicker items={uniqueInvItems} value={form.ingredient_name}
            onSelect={(ing) => setForm((f) => ({ ...f, org_ingredient_id: ing.id, ingredient_name: ing.name, ingredient_unit: ing.unit }))} />
        </div>
        <div className="col-span-2">
          <Button size="sm" className="w-full" loading={addMutation.isPending}
            disabled={!form.ingredient_name || !form.quantity_used}
            onClick={() => addMutation.mutate()}>
            <Plus size={13} /> Add Ingredient
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Addon Recipe Panel (unchanged) ────────────────────────────

function AddonRecipePanel({ addon, orgId }: { addon: AddonItem; orgId: string }) {
  const qc = useQueryClient();
  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ["addon-ingredients", addon.id],
    queryFn:  () => recipesApi.getAddonIngredients(addon.id).then((r) => r.data),
  });
  const { data: invItems = [] } = useQuery({
    queryKey: ["org-catalog", orgId],
    queryFn:  () => inventoryApi.getCatalog(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });
  const [form, setForm] = useState({
    org_ingredient_id: null as string | null, ingredient_name: "",
    ingredient_unit: "", quantity_used: "",
  });
  const uniqueInvItems = useMemo(
    () => Array.from(new Map(invItems.map((i) => [i.name, i])).values()),
    [invItems],
  );
  const addMutation = useMutation({
    mutationFn: () => recipesApi.upsertAddonIngredient(addon.id, {
      org_ingredient_id: form.org_ingredient_id, ingredient_name: form.ingredient_name,
      ingredient_unit: form.ingredient_unit, quantity_used: parseFloat(form.quantity_used),
    }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["addon-ingredients", addon.id] });
      setForm((f) => ({ ...f, org_ingredient_id: null, ingredient_name: "", ingredient_unit: "", quantity_used: "" }));
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const delMutation = useMutation({
    mutationFn: (ingredientName: string) => recipesApi.deleteAddonIngredient(addon.id, ingredientName),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["addon-ingredients", addon.id] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        {isLoading ? <Skeleton className="h-16" />
          : ingredients.length === 0
            ? <p className="text-sm text-muted-foreground py-4 text-center">No ingredients</p>
            : ingredients.map((r) => (
                <div key={r.ingredient_name} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 group">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.ingredient_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.quantity_used} {fmtUnit(r.unit)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => delMutation.mutate(r.ingredient_name)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))}
      </div>
      <Separator />
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">Ingredient</Label>
          <IngredientPicker items={uniqueInvItems} value={form.ingredient_name}
            onSelect={(ing) => setForm((f) => ({ ...f, org_ingredient_id: ing.id, ingredient_name: ing.name, ingredient_unit: ing.unit }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quantity</Label>
          <Input className="h-8 text-xs" type="number" step="0.1" placeholder="e.g. 200"
            value={form.quantity_used}
            onChange={(e) => setForm((f) => ({ ...f, quantity_used: e.target.value }))} />
        </div>
        <Button size="sm" className="w-full" loading={addMutation.isPending}
          disabled={!form.ingredient_name || !form.quantity_used}
          onClick={() => addMutation.mutate()}>
          <Plus size={13} /> Add
        </Button>
      </div>
    </div>
  );
}

// ── Slots Panel ───────────────────────────────────────────────

function SlotsPanel({ item, allAddons }: { item: MenuItem; allAddons: AddonItem[] }) {
  const qc = useQueryClient();
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["addon-slots", item.id],
    queryFn:  () => menuApi.getAddonSlots(item.id).then((r) => r.data),
  });

  const [form, setForm] = useState({
    addon_type: "", label: "", is_required: false,
    min_selections: "0", max_selections: "",
  });

  // Derive all distinct types from existing addons + any already-slotted custom types
  const existingSlotTypes = new Set(slots.map((s) => s.addon_type));
  const knownTypes = Array.from(
    new Set([
      "milk_type", "coffee_type", "extra",
      ...allAddons.map((a) => a.type),
      ...existingSlotTypes,
    ])
  ).filter(Boolean).sort();

  const createMutation = useMutation({
    mutationFn: () => menuApi.createAddonSlot(item.id, {
      addon_type:     form.addon_type,
      label:          form.label || null,
      is_required:    form.is_required,
      min_selections: parseInt(form.min_selections) || 0,
      max_selections: form.max_selections ? parseInt(form.max_selections) : null,
    }),
    onSuccess: () => {
      toast.success("Slot saved");
      qc.invalidateQueries({ queryKey: ["addon-slots", item.id] });
      setForm({ addon_type: "", label: "", is_required: false, min_selections: "0", max_selections: "" });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ slotId, data }: { slotId: string; data: Partial<AddonSlot> }) =>
      menuApi.updateAddonSlot(item.id, slotId, data),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["addon-slots", item.id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => menuApi.deleteAddonSlot(item.id, slotId),
    onSuccess: () => {
      toast.success("Slot removed");
      qc.invalidateQueries({ queryKey: ["addon-slots", item.id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="p-4 space-y-4">
      {/* Info banner */}
      <div className="flex gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          The 3 global types (milk, coffee, extra) are shown on every drink by default.
          Add a slot here to make a type <strong>required</strong>, set min/max rules,
          or add a <strong>custom type</strong> like "sweetener" that only appears on this drink.
        </p>
      </div>

      {/* Existing slots */}
      {isLoading ? (
        <div className="space-y-2">{[1,2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">No custom slots yet</p>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => {
            const addonCount = allAddons.filter((a) => a.type === slot.addon_type && a.is_active).length;
            return (
              <div key={slot.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">
                      {slot.label || slot.addon_type?.replace(/_/g, " ")}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{slot.addon_type}</Badge>
                    {slot.is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                    <Badge variant="secondary" className="text-[10px]">
                      {slot.min_selections}–{slot.max_selections ?? "∞"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{addonCount} addons</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={slot.is_required}
                    onCheckedChange={(v) =>
                      updateMutation.mutate({ slotId: slot.id, data: { is_required: v } })
                    }
                  />
                  <span className="text-xs text-muted-foreground w-16">
                    {slot.is_required ? "Required" : "Optional"}
                  </span>
                  <Button variant="ghost" size="icon-sm" className="text-destructive"
                    onClick={() => deleteMutation.mutate(slot.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Separator />

      {/* Add new slot */}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add Slot</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Addon Type</Label>
          <Select value={form.addon_type} onValueChange={(v) => setForm((f) => ({ ...f, addon_type: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick type…" /></SelectTrigger>
            <SelectContent>
              {knownTypes.map((t) => (
                <SelectItem key={t} value={t} disabled={existingSlotTypes.has(t)}>
                  {t?.replace(/_/g, " ")}
                  {existingSlotTypes.has(t) ? " (already added)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Display Label <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input className="h-8 text-xs" placeholder='e.g. "Sweetness Level"'
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Min selections</Label>
          <Input className="h-8 text-xs" type="number" min={0} placeholder="0"
            value={form.min_selections}
            onChange={(e) => setForm((f) => ({ ...f, min_selections: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max selections <span className="text-muted-foreground font-normal">(blank = unlimited)</span></Label>
          <Input className="h-8 text-xs" type="number" min={1} placeholder="∞"
            value={form.max_selections}
            onChange={(e) => setForm((f) => ({ ...f, max_selections: e.target.value }))} />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <Switch checked={form.is_required}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_required: v }))} />
          <Label className="text-xs cursor-pointer">Required (teller must pick before adding to cart)</Label>
        </div>
        <div className="col-span-2">
          <Button size="sm" className="w-full" loading={createMutation.isPending}
            disabled={!form.addon_type}
            onClick={() => createMutation.mutate()}>
            <Plus size={13} /> Add Slot
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Override Matrix Panel ─────────────────────────────────────

function OptionalsPanel({
  item, orgId,
}: {
  item: MenuItem;
  orgId: string;
}) {
  const qc = useQueryClient();

  const { data: optionals = [], isLoading } = useQuery({
    queryKey: ["optional-fields", item.id],
    queryFn:  () => menuApi.getOptionalFields(item.id).then((r) => r.data),
  });

  const { data: invItems = [] } = useQuery({
    queryKey: ["org-catalog", orgId],
    queryFn:  () => inventoryApi.getCatalog(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });

  const [form, setForm] = useState({
    name: "",
    ingredient_name: "",
    org_ingredient_id: null as string | null,
    ingredient_unit: "",
    quantity_used: "",
    is_active: true,
  });

  const uniqueInvItems = useMemo(
    () => Array.from(new Map(invItems.map((i) => [i.name, i])).values()),
    [invItems],
  );

  const upsertMutation = useMutation({
    mutationFn: () => menuApi.upsertOptionalField(item.id, {
      name: form.name,
      ingredient_name: form.ingredient_name || null,
      org_ingredient_id: form.org_ingredient_id,
      ingredient_unit: form.ingredient_unit || null,
      quantity_used: form.quantity_used ? parseFloat(form.quantity_used) : null,
      is_active: form.is_active,
    }),
    onSuccess: () => {
      toast.success("Optional field saved");
      qc.invalidateQueries({ queryKey: ["optional-fields", item.id] });
      setForm({
        name: "", ingredient_name: "", org_ingredient_id: null,
        ingredient_unit: "", quantity_used: "", is_active: true,
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (fieldId: string) => menuApi.deleteOptionalField(item.id, fieldId),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["optional-fields", item.id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
        <AlertCircle size={14} className="text-teal-500 shrink-0 mt-0.5" />
        <p className="text-xs text-teal-700 dark:text-teal-300">
          Optional fields appear as checkboxes (e.g. "Add Whip"). They optionally deduct an ingredient from inventory if mapped.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : optionals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">No optional fields</p>
      ) : (
        <div className="space-y-2">
          {optionals.map((o) => (
            <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 group border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{o.name}</p>
                  {!o.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                </div>
                {o.ingredient_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Deducts: {o.quantity_used} {fmtUnit(o.ingredient_unit ?? "")} of {o.ingredient_name}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon-sm"
                className="opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                onClick={() => deleteMutation.mutate(o.id)}>
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Separator />

      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add Custom Field</p>
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">Checkbox Label</Label>
          <Input className="h-8 text-xs" placeholder='e.g. "Add Salt"'
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Inventory Item <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <IngredientPicker items={uniqueInvItems} value={form.ingredient_name}
              onSelect={(ing) => setForm((f) => ({
                ...f, org_ingredient_id: ing.id,
                ingredient_name: ing.name, ingredient_unit: ing.unit,
              }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Qty</Label>
            <Input className="h-8 text-xs" type="number" step="0.1" placeholder="0"
              value={form.quantity_used}
              onChange={(e) => setForm((f) => ({ ...f, quantity_used: e.target.value }))}
              disabled={!form.org_ingredient_id} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
          <Label className="text-xs cursor-pointer">Active</Label>
        </div>
        <Button size="sm" className="w-full mt-2" loading={upsertMutation.isPending}
          disabled={!form.name} onClick={() => upsertMutation.mutate()}>
          <Plus size={13} /> Save Field
        </Button>
      </div>
    </div>
  );
}

// ── Slots & Overrides combined panel ──────────────────────────

function SlotsAndOptionalsPanel({
  item, allAddons, orgId,
}: {
  item: MenuItem;
  allAddons: AddonItem[];
  orgId: string;
}) {
  const [panel, setPanel] = useState<"slots" | "optionals">("slots");
  return (
    <div>
      <div className="flex border-b">
        {(["slots", "optionals"] as const).map((p) => (
          <button key={p}
            onClick={() => setPanel(p)}
            className={`px-4 py-2.5 text-xs font-semibold transition-colors
              ${panel === p
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"}`}>
            {p === "slots" ? "Slots" : "Optionals"}
          </button>
        ))}
      </div>
      {panel === "slots"
        ? <SlotsPanel item={item} allAddons={allAddons} />
        : <OptionalsPanel item={item} orgId={orgId} />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function Recipes() {
  const user  = useAuthStore((s) => s.user);
  const orgId = useAppStore((s) => s.selectedOrgId) ?? user?.org_id ?? "";
  const [tab, setTab]           = useState("drinks");
  const [selItem, setSelItem]   = useState<MenuItem | null>(null);
  const [selAddon, setSelAddon] = useState<AddonItem | null>(null);
  const [selItemSO, setSelItemSO] = useState<MenuItem | null>(null);
  const [drinkSearch, setDrinkSearch] = useState("");
  const [addonSearch, setAddonSearch] = useState("");
  const [soSearch, setSoSearch]       = useState("");

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["menu-items", orgId],
    queryFn:  () => menuApi.getMenuItems(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });
  const { data: addons = [], isLoading: addonsLoading } = useQuery({
    queryKey: ["addon-items", orgId],
    queryFn:  () => menuApi.getAddonItems(orgId).then((r) => r.data),
    enabled:  !!orgId,
  });

  const filteredItems  = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(drinkSearch.toLowerCase())),
    [items, drinkSearch],
  );
  const filteredAddons = useMemo(
    () => addons.filter((a) => a.name.toLowerCase().includes(addonSearch.toLowerCase())),
    [addons, addonSearch],
  );
  const filteredSO = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(soSearch.toLowerCase())),
    [items, soSearch],
  );

  const ItemList = ({
    loading, filtered, selected, onSelect, search, onSearch, emptyIcon, placeholder,
  }: {
    loading: boolean;
    filtered: MenuItem[];
    selected: MenuItem | null;
    onSelect: (i: MenuItem) => void;
    search: string;
    onSearch: (v: string) => void;
    emptyIcon: typeof Coffee; // LucideIcon type
    placeholder: string;
  }) => (
    <div className="rounded-2xl border overflow-hidden">
      <div className="p-3 border-b bg-muted/30 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Menu Items</p>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder} className="h-7 pl-7 text-xs" />
        </div>
      </div>
      <ScrollArea className="h-[500px]">
        {loading
          ? <div className="p-3 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          : filtered.length === 0
            ? <EmptyState icon={emptyIcon} title="No items" className="h-40" />
            : filtered.map((item) => (
                <button key={item.id} onClick={() => onSelect(item)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors ${selected?.id === item.id ? "bg-accent" : ""}`}>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{egp(item.base_price)}</p>
                </button>
              ))}
      </ScrollArea>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Recipes" sub="Configure ingredient deductions and addon rules" />

      <Tabs value={tab} onValueChange={(v) => {
        setTab(v);
        setSelItem(null);
        setSelAddon(null);
        setSelItemSO(null);
      }}>
        <TabsList className="mb-6">
          <TabsTrigger value="drinks"><Coffee size={14} /> Drinks ({items.length})</TabsTrigger>
          <TabsTrigger value="addons"><Package size={14} /> Addons ({addons.length})</TabsTrigger>
          <TabsTrigger value="slots"><Settings2 size={14} /> Slots & Optionals</TabsTrigger>
        </TabsList>

        {/* ── Drinks ── */}
        <TabsContent value="drinks">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            <ItemList loading={itemsLoading} filtered={filteredItems} selected={selItem}
              onSelect={setSelItem} search={drinkSearch} onSearch={setDrinkSearch}
              emptyIcon={Coffee} placeholder="Search drinks…" />
            <div className="rounded-2xl border overflow-hidden">
              {selItem ? (
                <>
                  <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{selItem.name}</p>
                      <p className="text-xs text-muted-foreground">Ingredient deductions per size</p>
                    </div>
                    <Badge variant="info">{egp(selItem.base_price)}</Badge>
                  </div>
                  <DrinkRecipePanel item={selItem} orgId={orgId} />
                </>
              ) : (
                <EmptyState icon={BookOpen} title="Select a drink"
                  sub="Choose a menu item to configure its recipe" className="h-[500px]" />
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Addons ── */}
        <TabsContent value="addons">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            <div className="rounded-2xl border overflow-hidden">
              <div className="p-3 border-b bg-muted/30 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Addon Items</p>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={addonSearch} onChange={(e) => setAddonSearch(e.target.value)}
                    placeholder="Search addons…" className="h-7 pl-7 text-xs" />
                </div>
              </div>
              <ScrollArea className="h-[500px]">
                {addonsLoading
                  ? <div className="p-3 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                  : filteredAddons.length === 0
                    ? <EmptyState icon={Package} title="No addons" className="h-40" />
                    : filteredAddons.map((addon) => (
                        <button key={addon.id} onClick={() => setSelAddon(addon)}
                          className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors ${selAddon?.id === addon.id ? "bg-accent" : ""}`}>
                          <p className="text-sm font-medium">{addon.name}</p>
                          <p className="text-xs text-muted-foreground">{egp(addon.default_price)} · {addon.type}</p>
                        </button>
                      ))}
              </ScrollArea>
            </div>
            <div className="rounded-2xl border overflow-hidden">
              {selAddon ? (
                <>
                  <div className="p-4 border-b bg-muted/30">
                    <p className="font-semibold">{selAddon.name}</p>
                    <p className="text-xs text-muted-foreground">Global ingredient deductions</p>
                  </div>
                  <AddonRecipePanel addon={selAddon} orgId={orgId} />
                </>
              ) : (
                <EmptyState icon={Package} title="Select an addon"
                  sub="Choose an addon to configure its ingredients" className="h-[500px]" />
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Slots & Overrides ── */}
        <TabsContent value="slots">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            <ItemList loading={itemsLoading} filtered={filteredSO} selected={selItemSO}
              onSelect={setSelItemSO} search={soSearch} onSearch={setSoSearch}
              emptyIcon={Layers} placeholder="Search drinks…" />
            <div className="rounded-2xl border overflow-hidden">
              {selItemSO ? (
                <>
                  <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{selItemSO.name}</p>
                      <p className="text-xs text-muted-foreground">Custom slots and per-drink optional checkboxes</p>
                    </div>
                    <Badge variant="info">{egp(selItemSO.base_price)}</Badge>
                  </div>
                  <SlotsAndOptionalsPanel item={selItemSO} allAddons={addons} orgId={orgId} />
                </>
              ) : (
                <EmptyState icon={Settings2} title="Select a drink"
                  sub="Choose a menu item to configure its slots and optional fields"
                  className="h-[500px]" />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}