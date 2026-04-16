import client from "@/lib/client";
import type {
  Category, MenuItem, MenuItemFull, AddonItem,
  ItemSize, AddonSlot, MenuItemOptionalField,
} from "@/types";

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories = (orgId: string) =>
  client.get<Category[]>("/categories", { params: { org_id: orgId } });
export const createCategory = (data: Record<string, unknown>) =>
  client.post<Category>("/categories", data);
export const updateCategory = (id: string, data: Record<string, unknown>) =>
  client.patch<Category>(`/categories/${id}`, data);
export const deleteCategory = (id: string) =>
  client.delete(`/categories/${id}`);

// ── Menu items ────────────────────────────────────────────────────────────────
export const getMenuItems = (orgId: string, catId?: string | null) =>
  client.get<MenuItem[]>("/menu-items", {
    params: { org_id: orgId, ...(catId ? { category_id: catId } : {}) },
  });
export const getMenuItem = (id: string) =>
  client.get<MenuItemFull>(`/menu-items/${id}`);
export const createMenuItem = (data: Record<string, unknown>) =>
  client.post<MenuItemFull>("/menu-items", data);
export const updateMenuItem = (id: string, data: Record<string, unknown>) =>
  client.patch<MenuItem>(`/menu-items/${id}`, data);
export const deleteMenuItem = (id: string) =>
  client.delete(`/menu-items/${id}`);
export const uploadMenuItemImage = (id: string, file: File) => {
  const form = new FormData();
  form.append("image", file);
  return client.post<{ image_url: string }>(`/uploads/menu-items/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ── Sizes ─────────────────────────────────────────────────────────────────────
export const upsertSize = (
  itemId: string,
  data: { label: string; price_override: number; display_order?: number },
) => client.post<ItemSize>(`/menu-items/${itemId}/sizes`, data);
export const deleteSize = (itemId: string, sid: string) =>
  client.delete(`/menu-items/${itemId}/sizes/${sid}`);

// ── Addon items ───────────────────────────────────────────────────────────────
export const getAddonItems = (orgId: string, type?: string | null) =>
  client.get<AddonItem[]>("/addon-items", {
    params: { org_id: orgId, ...(type ? { type } : {}) },
  });
export const createAddonItem = (data: Record<string, unknown>) =>
  client.post<AddonItem>("/addon-items", data);
export const updateAddonItem = (id: string, data: Record<string, unknown>) =>
  client.patch<AddonItem>(`/addon-items/${id}`, data);
export const deleteAddonItem = (id: string) =>
  client.delete(`/addon-items/${id}`);

// ── Addon slots ───────────────────────────────────────────────────────────────
// Slots define per-drink addon selection groups (e.g. 'sweetener' on Matcha).
// The 3 global types are always shown; slots add/configure extras per drink.
export const getAddonSlots = (menuItemId: string) =>
  client.get<AddonSlot[]>(`/menu-items/${menuItemId}/addon-slots`);
export const createAddonSlot = (
  menuItemId: string,
  data: {
    addon_type: string;
    label?: string | null;
    is_required?: boolean;
    min_selections?: number;
    max_selections?: number | null;
    display_order?: number;
  },
) => client.post<AddonSlot>(`/menu-items/${menuItemId}/addon-slots`, data);
export const updateAddonSlot = (
  menuItemId: string,
  slotId: string,
  data: Partial<{
    label: string | null;
    is_required: boolean;
    min_selections: number;
    max_selections: number | null;
    display_order: number;
  }>,
) => client.patch<AddonSlot>(`/menu-items/${menuItemId}/addon-slots/${slotId}`, data);
export const deleteAddonSlot = (menuItemId: string, slotId: string) =>
  client.delete(`/menu-items/${menuItemId}/addon-slots/${slotId}`);

// ── Optional fields ───────────────────────────────────────────────────────────
// Per-drink checkboxes (e.g., "Add Whip") with optional inventory deductions.
export const getOptionalFields = (menuItemId: string) =>
  client.get<MenuItemOptionalField[]>(`/menu-items/${menuItemId}/optional-fields`);

export const upsertOptionalField = (
  menuItemId: string,
  data: {
    name: string;
    ingredient_name?: string | null;
    org_ingredient_id?: string | null;
    ingredient_unit?: string | null;
    quantity_used?: number | null;
    is_active?: boolean;
  },
) => client.post<MenuItemOptionalField>(`/menu-items/${menuItemId}/optional-fields`, data);

export const deleteOptionalField = (menuItemId: string, fieldId: string) =>
  client.delete(`/menu-items/${menuItemId}/optional-fields/${fieldId}`);