import { PackagePlus, TrendingUp } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { fmtMoney, fmtPercent } from "@/shared/lib/format";
import type { BundleSuggestion } from "../api/types";

interface BundleSuggestionGridProps {
  suggestions: BundleSuggestion[];
}

export function BundleSuggestionGrid({ suggestions }: BundleSuggestionGridProps) {
  // Sort by incremental CM mid, descending
  const sorted = [...suggestions].sort(
    (a, b) => b.forecast.incremental_cm_mid - a.forecast.incremental_cm_mid
  );

  if (sorted.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground">
        No bundle opportunities found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {sorted.map(bundle => (
        <Card key={bundle.id || bundle.focus_item} className="overflow-hidden hover:border-primary/50 transition-colors">
          <CardContent className="p-0">
            {/* Header: Items */}
            <div className="p-4 bg-muted/30 border-b">
              <div className="flex items-center gap-2 mb-2">
                <PackagePlus size={16} className="text-primary" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Bundle Opportunity</span>
              </div>
              <p className="font-bold text-base leading-tight">
                {bundle.focus_item} <span className="text-muted-foreground font-normal mx-1">+</span> {bundle.bundle_items.join(" + ")}
              </p>
            </div>
            
            {/* Body: Prices & Discount */}
            <div className="p-4 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Suggested Price</p>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                      {fmtMoney(bundle.bundle_list_price)}
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {fmtMoney(bundle.bundle_suggested_price)}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-primary bg-primary/10 hover:bg-primary/20">
                  {fmtPercent(bundle.bundle_discount_pct)} OFF
                </Badge>
              </div>

              {/* Explanation */}
              <p className="text-sm text-muted-foreground bg-background rounded-md border p-3">
                {bundle.explanation}
              </p>

              {/* Financial Impact */}
              <div className="flex items-center gap-2 p-3 bg-success/10 text-success rounded-lg border border-success/20">
                <TrendingUp size={16} />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase">Est. Incremental Margin</p>
                  <p className="font-mono font-bold text-sm">+{fmtMoney(bundle.forecast.incremental_cm_mid)} / day</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
