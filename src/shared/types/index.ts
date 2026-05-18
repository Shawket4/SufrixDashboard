import type {
  AdjustmentType,
  InventoryUnit,
  OrderStatus,
  PaymentMethod,
  PrinterBrand,
  Role,
  ShiftStatus,
} from "@/shared/config/constants";

// Re-export enum types for convenience so consumers can import everything from one place
export type { AdjustmentType, InventoryUnit, OrderStatus, PaymentMethod, PrinterBrand, Role, ShiftStatus };

// ── Auth / User ──────────────────────────────────────────────────────────────

export interface UserPublic {
  id: string;
  org_id: string | null;
  branch_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  is_active: boolean;
}

export interface LoginResponse {
  token: string;
  user: UserPublic;
}

export interface UserBranch {
  branch_id: string;
  branch_name: string;
}

// ── Org ──────────────────────────────────────────────────────────────────────

export interface Org {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  currency_code: string;
  tax_rate: number;
  receipt_footer: string | null;
  is_active: boolean;
}

// ── Branch ───────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  printer_brand: PrinterBrand | null;
  printer_ip: string | null;
  printer_port: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Permissions ──────────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  user_id: string;
  resource: string;
  action: string;
  granted: boolean;
}

export interface RolePermission {
  role: string;
  resource: string;
  action: string;
  granted: boolean;
}

export interface PermissionMatrix {
  resource: string;
  action: string;
  role_default: boolean | null;
  user_override: boolean | null;
  effective: boolean;
}

// ── Menu ─────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  org_id: string;
  name: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddonItem {
  id: string;
  org_id: string;
  name: string;
  addon_type: string; // free text — e.g. "coffee_type", "milk_type", "extra", "sweetener"
  default_price: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ItemSize {
  id: string;
  menu_item_id: string;
  label: string;
  price_override: number;
  display_order: number;
  is_active: boolean;
}

export interface AddonSlot {
  id: string;
  menu_item_id: string;
  addon_type: string;
  label: string | null;
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  display_order: number;
  created_at: string;
}

export interface MenuItemOptionalField {
  id: string;
  menu_item_id: string;
  name: string;
  ingredient_name: string | null;
  org_ingredient_id: string | null;
  ingredient_unit: string | null;
  quantity_used: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  org_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Recipe row as embedded in GET /menu-items/:id (distinct from the top-level
 * `DrinkRecipe` which is what /recipes/drinks/:id returns). The embedded
 * shape ships extra fields (`category`, `ingredient_unit` vs `unit`) that the
 * POS app relies on at order time.
 */
export interface MenuItemEmbeddedRecipe {
  org_ingredient_id: string | null;
  quantity_used: number | string;
  ingredient_name: string;
  ingredient_unit: string;
  category: string;
  size_label: string;
}

export interface MenuItemFull extends MenuItem {
  sizes: ItemSize[];
  /** Per-drink addon slots configured for this item */
  addon_slots?: AddonSlot[];
  /** Per-drink optional fields (e.g. "Add Whip") */
  optional_fields?: MenuItemOptionalField[];
  /** Base + per-size ingredient recipes, embedded in the detail endpoint */
  recipes?: MenuItemEmbeddedRecipe[];
  /** Org-level default for the milk slot */
  default_milk_addon_id?: string | null;
}

// ── Recipes ──────────────────────────────────────────────────────────────────

export interface DrinkRecipe {
  id: string;
  menu_item_id: string;
  size_label: string;
  ingredient_name: string;
  unit: string;
  quantity_used: number;
}

export interface AddonIngredient {
  id: string;
  addon_item_id: string;
  org_ingredient_id: string | null;
  ingredient_name: string;
  unit: string;
  quantity_used: number;
}

// ── Inventory ────────────────────────────────────────────────────────────────

export interface OrgIngredient {
  id: string;
  org_id: string;
  name: string;
  unit: InventoryUnit;
  category: string;
  description: string | null;
  cost_per_unit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchInventoryItem {
  id: string;
  branch_id: string;
  org_ingredient_id: string;
  ingredient_name: string;
  unit: InventoryUnit;
  description: string | null;
  cost_per_unit: number;
  current_stock: number;
  reorder_threshold: number;
  below_reorder: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchInventoryAdjustment {
  id: string;
  branch_id: string;
  branch_inventory_id: string;
  ingredient_name: string;
  unit: string;
  adjustment_type: AdjustmentType;
  quantity: number;
  note: string;
  transfer_id: string | null;
  adjusted_by: string;
  adjusted_by_name: string;
  created_at: string;
}

export interface BranchInventoryTransfer {
  id: string;
  org_id: string;
  source_branch_id: string;
  source_branch_name: string;
  destination_branch_id: string;
  destination_branch_name: string;
  org_ingredient_id: string;
  ingredient_name: string;
  unit: string;
  quantity: number;
  note: string | null;
  initiated_by: string;
  initiated_by_name: string;
  initiated_at: string;
}

// ── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItemAddon {
  id: string;
  order_item_id: string;
  addon_item_id: string;
  addon_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface OrderItemOptional {
  id: string;
  order_item_id: string;
  optional_field_id: string | null;
  field_name: string;
  price: number;
  org_ingredient_id: string | null;
  ingredient_name: string | null;
  ingredient_unit: string | null;
  quantity_deducted: string | number | null;
}

export interface InventoryDeduction {
  org_ingredient_id: string | null;
  ingredient_name: string;
  unit: string;
  quantity: number;
  source: string;
  category: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  size_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  notes: string | null;
  addons: OrderItemAddon[];
  optionals?: OrderItemOptional[];
  deductions_snapshot: InventoryDeduction[];
}

export interface OrderItemFull {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  size_label: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  notes: string | null;
  deductions_snapshot: InventoryDeduction[];
  addons: OrderItemAddon[];
  optionals: OrderItemOptional[];
}

export interface OrderPayment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
}

export interface Order {
  id: string;
  branch_id: string;
  shift_id: string;
  teller_id: string;
  teller_name: string;
  order_number: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  discount_type: "percentage" | "fixed" | null;
  discount_value: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  customer_name: string | null;
  notes: string | null;
  amount_tendered: number | null;
  change_given: number | null;
  tip_amount: number | null;
  discount_id: string | null;
  voided_at: string | null;
  void_reason: string | null;
  voided_by: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderExport extends Order {
  items: OrderItemFull[];
  payments: OrderPayment[];
}

export interface ExportResponse {
  data: OrderExport[];
  total: number;
  generated_at: string;
  summary: {
    revenue: number;
    completed: number;
    voided: number;
    discounts: number;
    tips: number;
  };
}

export interface OrderSummary {
  revenue: number;
  completed: number;
  voided: number;
  discounts: number;
  tips: number;
}


export interface PaginatedOrders {
  data: Order[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  summary: OrderSummary;
}

export interface OrdersQuery {
  branch_id?: string;
  shift_id?: string;
  page?: number;
  per_page?: number;
  teller_name?: string;
  payment_method?: PaymentMethod;
  status?: OrderStatus;
  from?: string;
  to?: string;
}

// ── Shifts ───────────────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  branch_id: string;
  teller_id: string;
  teller_name: string;
  status: ShiftStatus;
  opening_cash: number;
  opening_cash_original: number | null;
  opening_cash_was_edited: boolean;
  opening_cash_edit_reason: string | null;
  closing_cash_declared: number | null;
  closing_cash_system: number | null;
  cash_discrepancy: number | null;
  opened_at: string;
  closed_at: string | null;
  closed_by: string | null;
  force_closed_by: string | null;
  force_closed_at: string | null;
  force_close_reason: string | null;
  notes: string | null;
}

export interface ShiftPreFill {
  has_open_shift: boolean;
  open_shift: Shift | null;
  suggested_opening_cash: number;
}

export interface CashMovement {
  id: string;
  shift_id: string;
  amount: number;
  note: string;
  moved_by: string;
  moved_by_name: string;
  created_at: string;
}

export interface PaymentSummaryRow {
  payment_method: PaymentMethod;
  total: number;
  order_count: number;
}

export interface CashMovementSummaryRow {
  amount: number;
  note: string;
  moved_by_name: string;
  created_at: string;
}

export interface ShiftReport {
  shift: Shift;
  payment_summary: PaymentSummaryRow[];
  total_payments: number;
  total_returns: number;
  net_payments: number;
  cash_movements: CashMovementSummaryRow[];
  cash_movements_in: number;
  cash_movements_out: number;
  cash_movements_net: number;
  printed_at: string;
}

// ── Reports / Analytics ──────────────────────────────────────────────────────

export interface ItemSales {
  menu_item_id: string;
  item_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface CategorySales {
  category_id: string | null;
  category_name: string | null;
  item_count: number;
  quantity_sold: number;
  revenue: number;
  items: ItemSales[];
}

export interface BranchSalesReport {
  branch_id: string;
  branch_name: string;
  from: string | null;
  to: string | null;
  total_orders: number;
  voided_orders: number;
  subtotal: number;
  total_discount: number;
  total_tax: number;
  total_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  digital_wallet_revenue: number;
  mixed_revenue: number;
  talabat_online_revenue: number;
  talabat_cash_revenue: number;
  top_items: ItemSales[];
  by_category: CategorySales[];
}

export interface TimeseriesPoint {
  period: string;
  orders: number;
  revenue: number;
  voided: number;
  discount: number;
  tax: number;
  cash_revenue: number;
  card_revenue: number;
  digital_wallet_revenue: number;
  mixed_revenue: number;
  talabat_online_revenue: number;
  talabat_cash_revenue: number;
}

export interface TellerStats {
  teller_id: string;
  teller_name: string;
  orders: number;
  revenue: number;
  avg_order_value: number;
  voided: number;
  shifts: number;
}

export interface AddonSalesRow {
  addon_item_id: string;
  addon_name: string;
  addon_type: string;
  quantity_sold: number;
  revenue: number;
}

export interface BranchComparison {
  branch_id: string;
  branch_name: string;
  total_orders: number;
  voided_orders: number;
  total_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  digital_wallet_revenue: number;
  mixed_revenue: number;
  talabat_online_revenue: number;
  talabat_cash_revenue: number;
  avg_order_value: number;
  void_rate_pct: number;
}

export interface OrgComparisonReport {
  org_id: string;
  from: string | null;
  to: string | null;
  branches: BranchComparison[];
}

export interface StockRow {
  branch_inventory_id: string;
  ingredient_name: string;
  unit: string;
  current_stock: number;
  reorder_threshold: number;
  cost_per_unit: number;
  below_reorder: boolean;
}

export interface BranchStockReport {
  branch_id: string;
  branch_name: string;
  items: StockRow[];
}

// ── Discounts ────────────────────────────────────────────────────────────────

export interface Discount {
  id: string;
  org_id: string;
  name: string;
  dtype: "percentage" | "fixed";
  value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Public Menu ─────────────────────────────────────────────────────────────

export interface PublicAddonItem {
  id: string;
  name: string;
  default_price: number;
}

export interface PublicAddonSlot {
  id: string;
  addon_type: string;
  label: string | null;
  is_required: boolean;
  min_selections: number;
  max_selections: number | null;
  addon_items: PublicAddonItem[];
}

export interface PublicItemSize {
  id: string;
  label: string;
  price_override: number;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  display_order: number;
  sizes: PublicItemSize[];
  addon_slots: PublicAddonSlot[];
}

export interface PublicCategory {
  id: string;
  name: string;
  image_url: string | null;
  display_order: number;
  items: PublicMenuItem[];
}

export interface PublicMenuResponse {
  org_id: string;
  org_name: string;
  logo_url: string | null;
  categories: PublicCategory[];
}
