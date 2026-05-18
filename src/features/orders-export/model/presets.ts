import type { LucideIcon } from "lucide-react";
import { Receipt, Bike, ClipboardCheck, Leaf, SlidersHorizontal } from "lucide-react";
import type { OrdersQuery, PaymentMethod } from "@/shared/types";
import type { Grain, PresetId } from "./types";

export interface PresetSpec {
  id: PresetId;
  i18nKey: string;
  icon: LucideIcon;
  grains: Grain[];
  filterOverrides: Partial<OrdersQuery>;
  description: string;
}

export const PRESETS: PresetSpec[] = [
  {
    id: "accountant_daily",
    i18nKey: "ordersExport.presets.accountantDaily.label",
    description: "ordersExport.presets.accountantDaily.desc",
    grains: ["order"],
    filterOverrides: { status: "completed" },
    icon: Receipt,
  },
  {
    id: "talabat_reconcile",
    i18nKey: "ordersExport.presets.talabatReconcile.label",
    description: "ordersExport.presets.talabatReconcile.desc",
    grains: ["order"],
    filterOverrides: { payment_method: "talabat_online,talabat_cash" as PaymentMethod },
    icon: Bike,
  },
  {
    id: "shift_handoff",
    i18nKey: "ordersExport.presets.shiftHandoff.label",
    description: "ordersExport.presets.shiftHandoff.desc",
    grains: ["order", "payment"],
    filterOverrides: {},
    icon: ClipboardCheck,
  },
  {
    id: "ingredient_consumption",
    i18nKey: "ordersExport.presets.ingredientConsumption.label",
    description: "ordersExport.presets.ingredientConsumption.desc",
    grains: ["deduction"],
    filterOverrides: { status: "completed" },
    icon: Leaf,
  },
  {
    id: "custom",
    i18nKey: "ordersExport.presets.custom.label",
    description: "ordersExport.presets.custom.desc",
    grains: ["order"],
    filterOverrides: {},
    icon: SlidersHorizontal,
  },
];
