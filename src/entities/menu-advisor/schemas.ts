import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────

export const ClassificationModeSchema = z.enum(["cm", "revenue", "insufficient"]);
export type ClassificationMode = z.infer<typeof ClassificationModeSchema>;

export const CmQuadrantSchema = z.enum(["star", "plowhorse", "puzzle", "dog"]);
export type CmQuadrant = z.infer<typeof CmQuadrantSchema>;

export const RevenueClassSchema = z.enum(["hero", "steady", "slow", "quiet"]);
export type RevenueClass = z.infer<typeof RevenueClassSchema>;

export const ActionSchema = z.enum([
  "hold", "raise_price", "lower_price", "bundle", "remove", "reformulate", "monitor"
]);
export type Action = z.infer<typeof ActionSchema>;

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const DecisionSchema = z.enum(["accepted", "rejected", "ignored"]);
export type Decision = z.infer<typeof DecisionSchema>;

export const GuardClipSchema = z.enum(["margin_floor", "change_cap", "cultural_rounding"]);
export type GuardClip = z.infer<typeof GuardClipSchema>;

export const RemovalRecommendationSchema = z.enum([
  "remove", "keep_and_bundle", "keep_and_reformulate", "no_strong_signal"
]);
export type RemovalRecommendation = z.infer<typeof RemovalRecommendationSchema>;

export const RunStatusSchema = z.enum(["in_progress", "completed", "failed"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const SuggestionKindSchema = z.enum(["price", "bundle", "removal"]);
export type SuggestionKind = z.infer<typeof SuggestionKindSchema>;

// ─── Composites ─────────────────────────────────────────────

export interface ItemKey {
  menu_item_id: string;
  size_label: string;
}

// Tagged union — exactly what the backend emits.
export type Classification =
  | { mode: "cm"; quadrant: CmQuadrant }
  | { mode: "revenue"; class: RevenueClass }
  | { mode: "insufficient" };

export interface DecisionRecord {
  id: string;
  suggestion_id: string;
  suggestion_kind: SuggestionKind;
  branch_id: string;
  decision: Decision;
  notes: string | null;
  decided_by: string;
  decided_at: string;
}

export interface PriceAnchors {
  cost_plus: number | null;
  peer_median: number;
  status_quo: number;
}

export interface PeerComparison {
  same_category_count: number;
  median_effective_price_peers: number;
  median_margin_pct_peers: number | null;
  median_cm_per_unit_peers: number | null;
  your_position: "above" | "at" | "below";
}

export interface BundleAssociation {
  pair_lifts: Array<{
    item_a: ItemKey;
    item_b: ItemKey;
    lift: number;
    support: number;
    confidence_ab: number;
  }>;
  composite_score: number;
}

export interface Triplet {
  lo: number;
  mid: number;
  hi: number;
}

export interface BundleForecast {
  expected_velocity: Triplet;
  inside_bundle_units_x: number;
  halo_units_x: number;
  total_units_uplift_x: number;
  incremental_cm: Triplet | null;
}

export interface AbsorbedBy {
  key: ItemKey;
  absorbed_units: number;
  absorbed_cm: number;
}

export interface ComplementaryLoss {
  key: ItemKey;
  lost_units: number;
  lost_cm: number;
}

// ─── Filters ────────────────────────────────────────────────

export interface PriceSuggestionFilter {
  classification_mode?: ClassificationMode;
  cm_quadrant?: CmQuadrant;
  revenue_class?: RevenueClass;
  action?: Action;
  confidence?: Confidence;
  category_id?: string;
  decision_status?: Decision | "pending";
  search?: string;
}

export interface BundleSuggestionFilter {
  missing_costs?: boolean;
  focus_menu_item_id?: string;
  decision_status?: Decision | "pending";
}

export interface RemovalScenarioFilter {
  recommendation?: RemovalRecommendation;
  decision_status?: Decision | "pending";
}

// ─── Records (FLAT — matches what the backend actually sends) ─

export interface PriceSuggestionRecord {
  id: string;
  run_id: string;
  branch_id: string;
  created_at: string;
  decision: DecisionRecord | null;

  // Flattened from the engine's PriceSuggestion:
  key: ItemKey;
  item_name: string;
  classification: Classification;
  current_price: number;
  units_sold_raw: number;
  effective_price: number;
  popularity_share: number;
  cm_per_unit: number | null;
  margin_pct: number | null;
  food_cost_pct: number | null;
  anchors: PriceAnchors;
  suggested_price: number | null;
  suggested_delta_abs: number | null;
  suggested_delta_pct: number | null;
  action: Action;
  confidence: Confidence;
  explanation: string;
  guard_clips: GuardClip[];
  peer_comparison: PeerComparison | null;
  price_changed_in_window: boolean;
  cost_reduction_whatif_margin: number | null;
  cost_missing: boolean;
}

export interface BundleSuggestionRecord {
  id: string;
  run_id: string;
  branch_id: string;
  created_at: string;
  decision: DecisionRecord | null;
  promoted_bundle_id: string | null;

  focus_item: ItemKey;
  bundle_items: ItemKey[];
  bundle_list_price: number;
  bundle_suggested_price: number;
  bundle_discount_pct: number;
  bundle_cost: number | null;
  bundle_cm: number | null;
  bundle_margin_pct: number | null;
  association: BundleAssociation;
  forecast: BundleForecast;
  guard_clips: GuardClip[];
  explanation: string;
  missing_costs: boolean;
}

export interface RemovalScenarioRecord {
  id: string;
  run_id: string;
  branch_id: string;
  created_at: string;
  decision: DecisionRecord | null;

  key: ItemKey;
  item_name: string;
  baseline_cm: number;
  absorbed_by: AbsorbedBy[];
  complementary_losses: ComplementaryLoss[];
  net_cm_change: number;
  net_cm_change_lo: number;
  net_cm_change_hi: number;
  recommendation: RemovalRecommendation;
  explanation: string;
}

// ─── Run ────────────────────────────────────────────────────

export interface ModeSummary {
  items_total: number;
  items_cm_tracked: number;
  items_revenue_only: number;
  items_insufficient: number;
}

export interface RunRecord {
  id: string;
  branch_id: string;
  org_id: string;
  status: RunStatus;
  config: Record<string, unknown>;
  mode_summary: ModeSummary;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  window_days: number;
}