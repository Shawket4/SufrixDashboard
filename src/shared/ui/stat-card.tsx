import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Skeleton } from "./skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { fmtMoney, fmtMoneyCompact, fmtNumber, fmtPercent } from "@/shared/lib/format";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  loading?: boolean;
  className?: string;
  accent?: "primary" | "success" | "warning" | "destructive" | "info" | "violet";
  onClick?: () => void;
  tooltip?: string | number;
  size?: "sm" | "md" | "lg" | "auto";
  formatType?: "money" | "percent" | "number";
}

const ACCENT_BG: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  loading,
  className,
  accent = "primary",
  onClick,
  tooltip,
  size = "auto",
  formatType,
}: StatCardProps) {
  if (loading)
    return (
      <div className={cn("rounded-xl border bg-card p-4 sm:p-5 space-y-3", className)}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    );

  // ── Compacting & Formatting Logic ──────────────────────────────────────────
  let fullDisplay = "";
  let compactDisplay = "";
  let isCompacted = false;

  if (typeof value === "number") {
    if (formatType === "money") {
      fullDisplay = fmtMoney(value);
      // Compact if >= 10,000 EGP (1,000,000 piastres)
      if (value >= 1_000_000) {
        compactDisplay = fmtMoneyCompact(value);
        isCompacted = compactDisplay !== fullDisplay;
      } else {
        compactDisplay = fullDisplay;
      }
    } else if (formatType === "percent") {
      fullDisplay = fmtPercent(value);
      compactDisplay = fullDisplay;
    } else {
      fullDisplay = fmtNumber(value);
      if (value >= 1_000_000) {
        compactDisplay = fmtNumber(value / 1_000_000, { maximumFractionDigits: 1 }) + "M";
        isCompacted = true;
      } else if (value >= 1_000) {
        compactDisplay = fmtNumber(value / 1_000, { maximumFractionDigits: 1 }) + "K";
        isCompacted = true;
      } else {
        compactDisplay = fullDisplay;
      }
    }
  } else {
    fullDisplay = value?.toString() ?? "";
    compactDisplay = fullDisplay;
  }

  const valStr = compactDisplay;
  const valueSizeClass =
    size === "sm"
      ? "text-base"
      : size === "md"
      ? "text-lg sm:text-xl"
      : size === "lg"
      ? "text-xl sm:text-2xl"
      : valStr.length > 16
      ? "text-base sm:text-lg"
      : valStr.length > 12
      ? "text-lg sm:text-xl"
      : valStr.length > 9
      ? "text-xl sm:text-2xl"
      : "text-2xl";

  const renderedValue = (
    <span className={cn("font-bold tabular font-sans tracking-tight block", valueSizeClass)}>
      {compactDisplay}
    </span>
  );

  const valueNode = (isCompacted || tooltip) ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="text-start focus:outline-none cursor-help border-b border-dashed border-muted-foreground/40 pb-0.5 transition-colors hover:border-muted-foreground">
          {renderedValue}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-semibold text-xs bg-popover text-popover-foreground border shadow-sm">
        {tooltip ?? fullDisplay}
      </TooltipContent>
    </Tooltip>
  ) : (
    renderedValue
  );

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">{label}</p>
          <div className="mt-1">{valueNode}</div>
          {sub && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
          {trend && (
            <p className={cn("text-[10px] sm:text-xs font-semibold mt-1 truncate", trend.value >= 0 ? "text-success" : "text-destructive")}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0", ACCENT_BG[accent])}>
            <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
        )}
      </div>
    </div>
  );
}
