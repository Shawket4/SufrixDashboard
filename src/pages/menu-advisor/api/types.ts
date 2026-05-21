export type Quadrant = "Star" | "Plowhorse" | "Puzzle" | "Dog" | "InsufficientData";
export type Action = "Hold" | "RaisePrice" | "LowerPrice" | "Bundle" | "Remove" | "Reformulate" | "Monitor";
export type Confidence = "Low" | "Medium" | "High";

export interface PriceSuggestion {
  item_id: string;
  item_name: string;
  current_price: number;
  suggested_price: number;
  suggested_delta_pct: number;
  quadrant: Quadrant;
  action: Action;
  confidence: Confidence;
  explanation: string;
  anchors?: {
    cost_plus?: number;
    peer_median?: number;
    status_quo?: number;
  };
  margin_pct?: number;
  food_cost_pct?: number;
  guard_clips?: string[];
  popularity_share?: number;
}

export interface BundleSuggestion {
  id: string;
  focus_item: string;
  bundle_items: string[];
  bundle_list_price: number;
  bundle_suggested_price: number;
  bundle_discount_pct: number;
  forecast: {
    incremental_cm_mid: number;
  };
  explanation: string;
}

export interface RemovalScenario {
  item_id: string;
  item_name: string;
  baseline_cm: number;
  net_cm_change: number;
  recommendation: string;
  explanation: string;
}

export interface AdvisorReport {
  generated_at: string;
  window_days: number;
  items_total: number;
  items_sufficient: number;
  price_suggestions: PriceSuggestion[];
  bundle_suggestions: BundleSuggestion[];
  removal_scenarios: RemovalScenario[];
}
