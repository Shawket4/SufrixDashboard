import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { fmtMoney, fmtPercent } from "@/shared/lib/format";
import type { PriceSuggestion } from "../api/types";
import { cn } from "@/shared/lib/cn";

interface SuggestionDetailsProps {
  suggestion: PriceSuggestion;
}

export function SuggestionDetails({ suggestion }: SuggestionDetailsProps) {
  const hasAnchors = suggestion.anchors && Object.keys(suggestion.anchors).length > 0;
  
  return (
    <div className="p-4 bg-muted/20 border-t space-y-4 text-sm animate-fade-in">
      {/* Explanation - Very Prominent */}
      <div className="flex gap-2 p-3 bg-primary/5 text-primary rounded-lg border border-primary/20">
        <Info className="shrink-0 mt-0.5" size={16} />
        <p className="font-medium leading-relaxed">{suggestion.explanation}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Anchors Math */}
        {hasAnchors && (
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Pricing Anchors</h4>
            <div className="space-y-1 bg-background rounded-md p-3 border">
              {suggestion.anchors?.cost_plus !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost-Plus:</span>
                  <span className="font-medium tabular">{fmtMoney(suggestion.anchors.cost_plus)}</span>
                </div>
              )}
              {suggestion.anchors?.peer_median !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peer Median:</span>
                  <span className="font-medium tabular">{fmtMoney(suggestion.anchors.peer_median)}</span>
                </div>
              )}
              {suggestion.anchors?.status_quo !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status Quo:</span>
                  <span className="font-medium tabular">{fmtMoney(suggestion.anchors.status_quo)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financials & Confidence */}
        <div className="space-y-2">
           <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Financials & Signal</h4>
           <div className="space-y-2 bg-background rounded-md p-3 border">
             <div className="flex justify-between items-center">
               <span className="text-muted-foreground">Est. Margin:</span>
               <span className={cn("font-medium", (suggestion.margin_pct ?? 0) < 0.2 ? "text-danger" : "text-success")}>
                 {suggestion.margin_pct !== undefined ? fmtPercent(suggestion.margin_pct) : "—"}
               </span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-muted-foreground">Food Cost:</span>
               <span className="font-medium">
                 {suggestion.food_cost_pct !== undefined ? fmtPercent(suggestion.food_cost_pct) : "—"}
               </span>
             </div>
             <div className="flex justify-between items-center pt-2 border-t mt-2">
               <span className="text-muted-foreground">Signal Confidence:</span>
               <Badge 
                 variant={suggestion.confidence === "High" ? "success" : suggestion.confidence === "Medium" ? "warning" : "default"}
                 className="text-[10px]"
               >
                 {suggestion.confidence}
               </Badge>
             </div>
           </div>
        </div>
      </div>

      {/* Guard Clips Warning */}
      {suggestion.guard_clips && suggestion.guard_clips.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-warning/10 text-warning rounded-lg border border-warning/20">
          <AlertTriangle className="shrink-0 mt-0.5" size={16} />
          <div>
            <p className="font-semibold text-xs uppercase mb-1">Safety Guards Applied</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              {suggestion.guard_clips.map((clip, i) => (
                <li key={i}>{clip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
