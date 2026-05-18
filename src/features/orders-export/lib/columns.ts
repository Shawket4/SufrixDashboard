import type { TFunction } from "i18next";
import type { ExcelColumn } from "@/shared/lib/excel";
import type { OrderExport } from "@/shared/types";

// Order Grain Row type is OrderExport directly
export const orderColumns = (t: TFunction): ExcelColumn<OrderExport>[] => [
  {
    key: "order_number",
    header: t("orders.orderNumber", { defaultValue: "#" }),
    accessor: (o) => o.order_number,
    type: "integer",
    width: 10,
  },
  {
    key: "created_at",
    header: t("orders.date", { defaultValue: "Date" }),
    accessor: (o) => new Date(o.created_at),
    type: "dateTime",
    width: 20,
  },
  {
    key: "teller",
    header: t("dashboard.teller", { defaultValue: "Teller" }),
    accessor: (o) => o.teller_name,
    type: "text",
    width: 18,
  },
  {
    key: "customer",
    header: t("orders.customer", { defaultValue: "Customer" }),
    accessor: (o) => o.customer_name || "—",
    type: "text",
    width: 18,
  },
  {
    key: "payment_method",
    header: t("orders.paymentMethod", { defaultValue: "Payment Method" }),
    accessor: (o) => t(`payments.${o.payment_method}`, { defaultValue: o.payment_method }),
    type: "text",
    width: 18,
  },
  {
    key: "subtotal",
    header: t("orders.subtotal", { defaultValue: "Subtotal" }),
    accessor: (o) => o.subtotal,
    type: "money",
    width: 15,
    total: true,
  },
  {
    key: "discount",
    header: t("orders.discount", { defaultValue: "Discount" }),
    accessor: (o) => o.discount_amount,
    type: "money",
    width: 15,
    total: true,
  },
  {
    key: "tax",
    header: t("orders.tax", { defaultValue: "Tax" }),
    accessor: (o) => o.tax_amount,
    type: "money",
    width: 15,
    total: true,
  },
  {
    key: "tip",
    header: t("orders.totalTips", { defaultValue: "Tip" }),
    accessor: (o) => o.tip_amount || 0,
    type: "money",
    width: 15,
    total: true,
  },
  {
    key: "total",
    header: t("orders.total", { defaultValue: "Total" }),
    accessor: (o) => o.total_amount,
    type: "money",
    width: 15,
    total: true,
  },
  {
    key: "status",
    header: t("common.status", { defaultValue: "Status" }),
    accessor: (o) => t(`orderStatus.${o.status}`, { defaultValue: o.status }),
    type: "text",
    width: 15,
  },
  {
    key: "void_reason",
    header: t("orders.voidReason", { defaultValue: "Void Reason" }),
    accessor: (o) => o.void_reason ? t(`voidReasons.${o.void_reason}`, { defaultValue: o.void_reason }) : "—",
    type: "text",
    width: 20,
  },
];

// Line Item Grain Row shape
export interface LineItemRow {
  order_number: number;
  created_at: string;
  payment_method: string;
  item_name: string;
  size_label: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  addons: string;
  optionals: string;
  notes: string | null;
}

export const lineItemColumns = (t: TFunction): ExcelColumn<LineItemRow>[] => [
  {
    key: "order_number",
    header: t("orders.orderNumber", { defaultValue: "#" }),
    accessor: (r) => r.order_number,
    type: "integer",
    width: 10,
  },
  {
    key: "created_at",
    header: t("orders.date", { defaultValue: "Date" }),
    accessor: (r) => new Date(r.created_at),
    type: "dateTime",
    width: 20,
  },
  {
    key: "payment_method",
    header: t("orders.paymentMethod", { defaultValue: "Payment Method" }),
    accessor: (r) => t(`payments.${r.payment_method}`, { defaultValue: r.payment_method }),
    type: "text",
    width: 18,
  },
  {
    key: "item_name",
    header: t("menu.itemName", { defaultValue: "Item Name" }),
    accessor: (r) => r.item_name,
    type: "text",
    width: 22,
  },
  {
    key: "size_label",
    header: t("menu.size", { defaultValue: "Size" }),
    accessor: (r) => r.size_label || "—",
    type: "text",
    width: 12,
  },
  {
    key: "quantity",
    header: t("common.qty", { defaultValue: "Qty" }),
    accessor: (r) => r.quantity,
    type: "number",
    width: 10,
    total: true,
  },
  {
    key: "unit_price",
    header: t("menu.unitPrice", { defaultValue: "Unit Price" }),
    accessor: (r) => r.unit_price,
    type: "money",
    width: 15,
  },
  {
    key: "line_total",
    header: t("orders.total", { defaultValue: "Line Total" }),
    accessor: (r) => r.line_total,
    type: "money",
    width: 15,
    total: true,
  },
  {
    key: "addons",
    header: t("menu.addons", { defaultValue: "Addons" }),
    accessor: (r) => r.addons || "—",
    type: "text",
    width: 25,
  },
  {
    key: "optionals",
    header: t("menu.optionals", { defaultValue: "Optionals" }),
    accessor: (r) => r.optionals || "—",
    type: "text",
    width: 25,
  },
  {
    key: "notes",
    header: t("common.notes", { defaultValue: "Notes" }),
    accessor: (r) => r.notes || "—",
    type: "text",
    width: 20,
  },
];

// Payment Grain Row shape
export interface PaymentRow {
  order_number: number;
  created_at: string;
  order_total: number;
  split_method: string;
  split_amount: number;
  reference: string | null;
}

export const paymentColumns = (t: TFunction): ExcelColumn<PaymentRow>[] => [
  {
    key: "order_number",
    header: t("orders.orderNumber", { defaultValue: "#" }),
    accessor: (r) => r.order_number,
    type: "integer",
    width: 10,
  },
  {
    key: "created_at",
    header: t("orders.date", { defaultValue: "Date" }),
    accessor: (r) => new Date(r.created_at),
    type: "dateTime",
    width: 20,
  },
  {
    key: "order_total",
    header: t("orders.total", { defaultValue: "Order Total" }),
    accessor: (r) => r.order_total,
    type: "money",
    width: 15,
    total: true,
  },
  {
    key: "split_method",
    header: t("orders.paymentMethod", { defaultValue: "Payment Method" }),
    accessor: (r) => t(`payments.${r.split_method}`, { defaultValue: r.split_method }),
    type: "text",
    width: 18,
  },
  {
    key: "split_amount",
    header: t("common.amount", { defaultValue: "Split Amount" }),
    accessor: (r) => r.split_amount,
    type: "money",
    width: 15,
    total: true,
  },
  {
    key: "reference",
    header: t("orders.reference", { defaultValue: "Reference" }),
    accessor: (r) => r.reference || "—",
    type: "text",
    width: 18,
  },
];

// Deduction Grain Row shape
export interface DeductionRow {
  order_number: number;
  created_at: string;
  item_name: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  source: string;
  category: string;
}

export const deductionColumns = (t: TFunction): ExcelColumn<DeductionRow>[] => [
  {
    key: "order_number",
    header: t("orders.orderNumber", { defaultValue: "#" }),
    accessor: (r) => r.order_number,
    type: "integer",
    width: 10,
  },
  {
    key: "created_at",
    header: t("orders.date", { defaultValue: "Date" }),
    accessor: (r) => new Date(r.created_at),
    type: "dateTime",
    width: 20,
  },
  {
    key: "item_name",
    header: t("menu.itemName", { defaultValue: "Item" }),
    accessor: (r) => r.item_name,
    type: "text",
    width: 22,
  },
  {
    key: "ingredient_name",
    header: t("inventory.ingredient", { defaultValue: "Ingredient" }),
    accessor: (r) => r.ingredient_name,
    type: "text",
    width: 22,
  },
  {
    key: "quantity",
    header: t("common.qty", { defaultValue: "Qty" }),
    accessor: (r) => r.quantity,
    type: "number",
    width: 12,
    total: true,
  },
  {
    key: "unit",
    header: t("inventory.unit", { defaultValue: "Unit" }),
    accessor: (r) => t(`inventoryUnits.${r.unit}`, { defaultValue: r.unit }),
    type: "text",
    width: 10,
  },
  {
    key: "source",
    header: t("common.source", { defaultValue: "Source" }),
    accessor: (r) => r.source,
    type: "text",
    width: 15,
  },
  {
    key: "category",
    header: t("common.category", { defaultValue: "Category" }),
    accessor: (r) => r.category,
    type: "text",
    width: 15,
  },
];

// Deduction Aggregated Row shape
export interface DeductionAggRow {
  ingredient_name: string;
  unit: string;
  total_quantity: number;
  occurrences: number;
}

export const deductionAggColumns = (t: TFunction): ExcelColumn<DeductionAggRow>[] => [
  {
    key: "ingredient_name",
    header: t("inventory.ingredient", { defaultValue: "Ingredient" }),
    accessor: (r) => r.ingredient_name,
    type: "text",
    width: 25,
  },
  {
    key: "total_quantity",
    header: t("orders.totalUsage", { defaultValue: "Total Quantity" }),
    accessor: (r) => r.total_quantity,
    type: "number",
    width: 15,
    total: true,
  },
  {
    key: "unit",
    header: t("inventory.unit", { defaultValue: "Unit" }),
    accessor: (r) => t(`inventoryUnits.${r.unit}`, { defaultValue: r.unit }),
    type: "text",
    width: 12,
  },
  {
    key: "occurrences",
    header: t("orders.occurrences", { defaultValue: "Occurrences" }),
    accessor: (r) => r.occurrences,
    type: "integer",
    width: 12,
    total: true,
  },
];
