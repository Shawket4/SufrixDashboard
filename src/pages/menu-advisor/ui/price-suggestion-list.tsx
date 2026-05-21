import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { fmtMoney, fmtPercent } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import type { PriceSuggestion, RemovalScenario } from "../api/types";
import { SuggestionDetails } from "./suggestion-details";

// Colors for Quadrants
const quadColors: Record<string, string> = {
  Star: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Plowhorse: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Puzzle: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Dog: "bg-red-500/10 text-red-600 border-red-500/20",
  InsufficientData: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

interface PriceSuggestionListProps {
  suggestions: PriceSuggestion[];
  removals?: RemovalScenario[]; // Pass removals if rendering the Pruning tab
  isPruningTab?: boolean;
}

export function PriceSuggestionList({ suggestions, removals = [], isPruningTab = false }: PriceSuggestionListProps) {
  const [showStable, setShowStable] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter based on tab context
  let filtered = suggestions;
  if (isPruningTab) {
    filtered = suggestions.filter(s => s.action === "Remove" || s.action === "Reformulate");
  } else {
    // Hide Hold/Monitor unless toggled
    filtered = suggestions.filter(s => {
      const isStable = s.action === "Hold" || s.action === "Monitor";
      return showStable ? true : !isStable;
    });
    // Further hide Remove/Reformulate from the pricing tab to avoid duplication
    filtered = filtered.filter(s => s.action !== "Remove" && s.action !== "Reformulate");
  }

  // Sort by priority then popularity
  const actionPriority: Record<string, number> = {
    RaisePrice: 1, LowerPrice: 2, Bundle: 3, Reformulate: 4, Remove: 5, Monitor: 6, Hold: 7
  };
  
  filtered.sort((a, b) => {
    const pA = actionPriority[a.action] ?? 99;
    const pB = actionPriority[b.action] ?? 99;
    if (pA !== pB) return pA - pB;
    return (b.popularity_share ?? 0) - (a.popularity_share ?? 0);
  });

  return (
    <div className="space-y-4">
      {!isPruningTab && (
        <div className="flex items-center justify-end space-x-2 pb-2">
          <Switch id="show-stable" checked={showStable} onCheckedChange={setShowStable} />
          <Label htmlFor="show-stable" className="text-sm cursor-pointer text-muted-foreground">
            Show "Hold" & "Monitor" items
          </Label>
        </div>
      )}

      {isPruningTab && removals.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Impact Scenarios</h3>
          <div className="grid gap-3">
            {removals.map(scenario => (
               <div key={scenario.item_name} className="p-4 rounded-xl border bg-background shadow-sm space-y-2">
                 <div className="flex justify-between items-start">
                   <p className="font-bold">{scenario.item_name || "Unknown Item"}</p>
                   <Badge variant={scenario.net_cm_change > 0 ? "success" : "destructive"}>
                      {scenario.net_cm_change > 0 ? "+" : ""}{fmtMoney(scenario.net_cm_change)} Net Margin
                   </Badge>
                 </div>
                 <p className="text-sm text-muted-foreground">{scenario.explanation}</p>
               </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground">
          No actionable suggestions right now.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(suggestion => {
            const isExpanded = expandedId === suggestion.item_name;
            const deltaPct = suggestion.suggested_delta_pct;
            const isRaise = deltaPct > 0;
            
            return (
              <div 
                key={suggestion.item_name} 
                className={cn(
                  "border rounded-xl bg-background transition-all overflow-hidden",
                  isExpanded ? "ring-2 ring-primary/20" : "hover:border-primary/30",
                  suggestion.quadrant === "InsufficientData" && "opacity-75 grayscale-[0.5]"
                )}
              >
                {/* Card Header (Clickable) */}
                <div 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : suggestion.item_name)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md border uppercase tracking-widest", quadColors[suggestion.quadrant] || quadColors.InsufficientData)}>
                      {suggestion.quadrant}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-base truncate pr-2">{suggestion.item_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-mono">{suggestion.action}</Badge>
                        {suggestion.quadrant === "InsufficientData" && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <AlertCircle size={10} /> Low Data
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 ml-auto sm:ml-0">
                    {/* Price Change */}
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 font-mono text-sm">
                        <span className="text-muted-foreground line-through decoration-muted-foreground/50">{fmtMoney(suggestion.current_price)}</span>
                        <ArrowRight size={14} className="text-muted-foreground" />
                        <span className="font-bold">{fmtMoney(suggestion.suggested_price)}</span>
                      </div>
                      {deltaPct !== 0 && (
                         <span className={cn(
                           "text-[10px] font-bold px-1.5 py-0.5 rounded mt-1",
                           isRaise ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                         )}>
                           {isRaise ? "+" : ""}{fmtPercent(deltaPct)}
                         </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                         <ExternalLink size={16} />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                         {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                       </Button>
                    </div>
                  </div>
                </div>

                {/* Details Accordion */}
                {isExpanded && (
                  <SuggestionDetails suggestion={suggestion} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
