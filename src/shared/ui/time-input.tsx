import { Clock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/** Parses "HH:MM" or "HH:MM:SS" into hour/minute parts. */
export function parseTimeValue(value: string | null | undefined): { hour: string; minute: string } | null {
  if (!value?.trim()) return null;
  const m = value.trim().match(/^(\d{2}):(\d{2})/);
  if (!m) return null;
  return { hour: m[1], minute: m[2] };
}

export interface TimeInputProps {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TimeInput({ value, onChange, disabled, className }: TimeInputProps) {
  const { t } = useTranslation();
  const parsed = parseTimeValue(value);
  const hour = parsed?.hour ?? "";
  const minute = parsed?.minute ?? "";

  const update = (h: string, m: string) => {
    if (!h && !m) {
      onChange("");
      return;
    }
    onChange(`${h || "00"}:${m || "00"}`);
  };

  const innerTrigger = cn(
    "h-8 min-w-0 border-0 bg-transparent shadow-none",
    "focus:ring-0 focus:ring-offset-0 px-1.5 flex-1",
  );

  return (
    <div
      className={cn(
        "flex h-10 w-full items-center gap-0.5 rounded-lg border border-input bg-background px-2",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />

      <Select
        value={hour || undefined}
        onValueChange={(h) => update(h, minute || "00")}
        disabled={disabled}
      >
        <SelectTrigger className={innerTrigger}>
          <SelectValue placeholder="--" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h} className="tabular-nums">
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm font-semibold text-muted-foreground tabular-nums select-none">:</span>

      <Select
        value={minute || undefined}
        onValueChange={(m) => update(hour || "00", m)}
        disabled={disabled}
      >
        <SelectTrigger className={innerTrigger}>
          <SelectValue placeholder="--" />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m} className="tabular-nums">
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {parsed && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={t("timePicker.clearTime")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
