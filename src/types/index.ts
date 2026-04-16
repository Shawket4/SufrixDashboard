// =============================================================================
//  Rue POS — TypeScript types matching Rust backend structs
// =============================================================================

// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole = "super_admin" | "org_admin" | "branch_manager" | "teller";

export interface UserPublic {
  id: string;
  org_id: string | null;
  branch_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
}

export interface LoginResponse {
  token: string;
  user: UserPublic;
}

// ── Organisations ─────────────────────────────────────────────────────────────
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

// ── Branches ──────────────────────────────────────────────────────────────────
export type PrinterBrand = "star" | "epson";

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

// ── Users ─────────────────────────────────────────────────────────────────────
export interface UserBranch {
  branch_id: string;
  branch_name: string;
}

// ── Permissions ───────────────────────────────────────────────────────────────
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

// ── Menu ──────────────────────────────────────────────────────────────────────
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

// The 3 built-in global addon types. Custom slot types (e.g. 'sweetener')
// are stored in menu_item_addon_slots.addon_type as free text.
export type GlobalAddonType = "coffee_type" | "milk_type" | "extra";

export interface AddonItem {
  id: string;
  org_id: string;
  name: string;
  // Now free text — no longer CHECK-constrained to 3 values
  type: string;
  default_price: number; // piastres
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

// ── Addon Slots ───────────────────────────────────────────────────────────────
// A slot defines an addon selection group on a specific menu item.
// The 3 global types (coffee_type, milk_type, extra) are shown on every drink
// by default. This table adds EXTRA slots (e.g. 'sweetener' on Matcha) or
// overrides the required/min-max rules for a global type on a specific drink.
export interface AddonSlot {
  id: string;
  menu_item_id: string;
  addon_type: string;        // matches AddonItem.type
  label: string | null;      // optional display override e.g. "Sweetness Level"
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

export interface MenuItemFull extends MenuItem {
  sizes: ItemSize[];
  // Legacy option_groups removed — slots are fetched separately in the dashboard
}

// ── Recipes ───────────────────────────────────────────────────────────────────
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

// ── Inventory ─────────────────────────────────────────────────────────────────
export type InventoryUnit = "g" | "kg" | "ml" | "l" | "pcs";

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
  adjustment_type: "add" | "remove" | "transfer_in" | "transfer_out";
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

// ── Orders ────────────────────────────────────────────────────────────────────
export type PaymentMethod =
  | "cash" | "card" | "digital_wallet" | "mixed"
  | "talabat_online" | "talabat_cash";

export type OrderStatus = "completed" | "voided";

export interface OrderItemAddon {
  id: string;
  order_item_id: string;
  addon_item_id: string;
  addon_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
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
  deductions_snapshot: InventoryDeduction[];
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

// ── Shifts ────────────────────────────────────────────────────────────────────
export type ShiftStatus = "open" | "closed" | "force_closed";

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

// ── Reports / Analytics ───────────────────────────────────────────────────────
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

export interface ShiftSummary {
  shift_id: string;
  branch_id: string;
  branch_name: string;
  teller_id: string;
  teller_name: string;
  status: ShiftStatus;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash_declared: number | null;
  closing_cash_system: number | null;
  cash_discrepancy: number | null;
  total_orders: number;
  voided_orders: number;
  total_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  digital_wallet_revenue: number;
  mixed_revenue: number;
  talabat_online_revenue: number;
  talabat_cash_revenue: number;
  total_discount: number;
  total_tax: number;
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

export interface InventoryDiscrepancy {
  branch_inventory_id: string;
  ingredient_name: string;
  unit: string;
  expected_stock: number;
  actual_count: number | null;
  discrepancy: number | null;
  note: string | null;
}

// ── Discounts ─────────────────────────────────────────────────────────────────
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