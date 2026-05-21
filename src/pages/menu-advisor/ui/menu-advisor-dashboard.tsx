
import { Sparkles, Activity, AlertCircle } from "lucide-react";
import { PageShell } from "@/shared/ui/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Card, CardContent } from "@/shared/ui/card";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { useAdvisorReport } from "../api/service";
import { PriceSuggestionList } from "./price-suggestion-list";
import { BundleSuggestionGrid } from "./bundle-suggestion-grid";

export default function MenuAdvisorDashboard() {
  const { orgId } = useCurrentContext();
  
  // Hardcoded to 30 days window for now, could be controlled via a date picker
  const windowDays = 30;
  const { data: report, isLoading, error } = useAdvisorReport(orgId || undefined, windowDays);

  if (isLoading) {
    return (
      <PageShell title="Menu Advisor" description="Analyzing menu performance...">
         <div className="space-y-4 animate-pulse">
           <div className="h-32 bg-muted rounded-xl"></div>
           <div className="h-64 bg-muted rounded-xl"></div>
         </div>
      </PageShell>
    );
  }

  if (error || !report) {
    return (
      <PageShell title="Menu Advisor" description="Menu Pricing & Bundle Suggestion Engine">
         <div className="p-8 text-center text-danger bg-danger/10 border border-danger/20 rounded-xl flex flex-col items-center gap-2">
           <AlertCircle />
           <p>Failed to load advisor report. Please try again later.</p>
         </div>
      </PageShell>
    );
  }

  return (
    <PageShell 
      title="Menu Advisor" 
      description={`Based on the last ${report.window_days} days of sales. Analyzed ${report.items_sufficient} out of ${report.items_total} items.`}
    >
      {/* Top Level Summary Matrix / Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-2xl font-bold text-emerald-600">
              {report.price_suggestions.filter(s => s.quadrant === "Star").length}
            </span>
            <span className="text-xs uppercase font-semibold text-emerald-600/80">Stars</span>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-2xl font-bold text-blue-600">
              {report.price_suggestions.filter(s => s.quadrant === "Plowhorse").length}
            </span>
            <span className="text-xs uppercase font-semibold text-blue-600/80">Plowhorses</span>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-2xl font-bold text-amber-600">
              {report.price_suggestions.filter(s => s.quadrant === "Puzzle").length}
            </span>
            <span className="text-xs uppercase font-semibold text-amber-600/80">Puzzles</span>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-2xl font-bold text-red-600">
              {report.price_suggestions.filter(s => s.quadrant === "Dog").length}
            </span>
            <span className="text-xs uppercase font-semibold text-red-600/80">Dogs</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
          <TabsTrigger value="pricing" className="gap-2"><Activity size={14} /> Pricing</TabsTrigger>
          <TabsTrigger value="bundles" className="gap-2"><Sparkles size={14} /> Bundles</TabsTrigger>
          <TabsTrigger value="pruning" className="gap-2"><AlertCircle size={14} /> Pruning</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pricing">
          <PriceSuggestionList suggestions={report.price_suggestions} />
        </TabsContent>
        
        <TabsContent value="bundles">
          <BundleSuggestionGrid suggestions={report.bundle_suggestions} />
        </TabsContent>
        
        <TabsContent value="pruning">
          <PriceSuggestionList 
            suggestions={report.price_suggestions} 
            removals={report.removal_scenarios} 
            isPruningTab 
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
