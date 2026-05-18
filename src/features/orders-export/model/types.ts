export type Grain = "order" | "line_item" | "payment" | "deduction";

export type PresetId =
  | "accountant_daily"
  | "talabat_reconcile"
  | "shift_handoff"
  | "ingredient_consumption"
  | "custom";

export interface ExportConfig {
  preset: PresetId;
  grains: Grain[];
  filename?: string;
}
