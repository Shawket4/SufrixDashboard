import * as React from "react";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cairoDateISO, cairoParts, fmtDate, cairoNow } from "@/shared/lib/format";
import { TZDate } from "@date-fns/tz";
import { subDays } from "date-fns";

type DayParts = { y: number; m: number; d: number };

const toNum = (p?: DayParts) => (p ? p.y * 10000 + p.m * 100 + p.d : null);

const getCairoToday = (): DayParts => {
  const d = cairoNow();
  return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
};

interface Props {
  from?: string | null;
  to?: string | null;
  onChange: (from: string | null, to: string | null) => void;
}

const PRESETS = [
  { key: "today", days: 0 },
  { key: "days7", days: 7 },
  { key: "days30", days: 30 },
  { key: "days90", days: 90 },
] as const;

export function DateRangePicker({ from, to, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ar") ? "ar-EG" : "en-GB";
  const [open, setOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState<DayParts | undefined>();

  const fromParts = from ? cairoParts(from) : undefined;
  const toParts = to ? cairoParts(to) : undefined;
  const [selected, setSelected] = React.useState<{ from?: DayParts; to?: DayParts }>({
    from: fromParts ? { y: fromParts.y, m: fromParts.m, d: fromParts.d } : undefined,
    to: toParts ? { y: toParts.y, m: toParts.m, d: toParts.d } : undefined,
  });

  const today = getCairoToday();
  const [month, setMonth] = React.useState(today.m);
  const [year, setYear] = React.useState(today.y);

  const applyPreset = (days: number) => {
    const tdy = cairoNow();
    const past = subDays(tdy, days);
    onChange(
      cairoDateISO(past.getFullYear(), past.getMonth(), past.getDate()),
      cairoDateISO(tdy.getFullYear(), tdy.getMonth(), tdy.getDate(), true)
    );
  };

  const isPresetActive = (days: number): boolean => {
    if (!from || !to) return false;
    const tdy = cairoNow();
    const past = subDays(tdy, days);
    return (
      from === cairoDateISO(past.getFullYear(), past.getMonth(), past.getDate()) &&
      to === cairoDateISO(tdy.getFullYear(), tdy.getMonth(), tdy.getDate(), true)
    );
  };

  const handleSelect = (p: DayParts) => {
    if (!selected.from || (selected.from && selected.to)) {
      setSelected({ from: p, to: undefined });
    } else {
      const f = toNum(selected.from)!;
      const c = toNum(p)!;
      if (c >= f) setSelected({ from: selected.from, to: p });
      else setSelected({ from: p, to: selected.from });
    }
  };

  const handleApply = () => {
    if (selected.from) {
      const f = selected.from;
      const tEnd = selected.to ?? selected.from;
      onChange(cairoDateISO(f.y, f.m, f.d), cairoDateISO(tEnd.y, tEnd.m, tEnd.d, true));
    }
    setOpen(false);
  };

  const isAllTime = !from && !to;
  const isCustom = Boolean(from) && !PRESETS.some((p) => isPresetActive(p.days)) && !isAllTime;

  const daysInMonth = new TZDate(year, month + 1, 0, "Africa/Cairo").getDate();
  const firstDay = new TZDate(year, month, 1, "Africa/Cairo").getDay();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const fromNum = toNum(selected.from);
  const toNum_ = toNum(selected.to ?? hovered);
  const todayNum = today.y * 10000 + today.m * 100 + today.d;

  const prevMonth = () =>
    month === 0 ? (setMonth(11), setYear((y) => y - 1)) : setMonth((m) => m - 1);
  const nextMonth = () =>
    month === 11 ? (setMonth(0), setYear((y) => y + 1)) : setMonth((m) => m + 1);

  const monthName = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(
    new TZDate(year, month, 1, "Africa/Cairo"),
  );

  const weekdayNames = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "Africa/Cairo" });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new TZDate(2024, 0, 7 + i, "Africa/Cairo"))); // Sun..Sat
  }, [locale]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((p) => (
        <Button
          key={p.key}
          variant={isPresetActive(p.days) ? "default" : "outline"}
          size="sm"
          onClick={() => applyPreset(p.days)}
          className="h-8 text-xs"
        >
          {t(`datePicker.${p.key}`)}
        </Button>
      ))}
      <Button variant={isAllTime ? "default" : "outline"} size="sm" onClick={() => onChange(null, null)} className="h-8 text-xs">
        {t("datePicker.allTime")}
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant={isCustom ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1.5">
            <CalendarIcon size={11} />
            {isCustom ? `${fmtDate(from)} → ${to ? fmtDate(to) : ""}` : t("datePicker.custom")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="start">
          <div className="flex items-center gap-3 mb-4 p-2.5 bg-muted rounded-lg text-xs">
            <div className="flex-1 text-center">
              <p className="text-muted-foreground mb-0.5">{t("common.from")}</p>
              <p className="font-semibold">{selected.from ? fmtDate(cairoDateISO(selected.from.y, selected.from.m, selected.from.d)) : "—"}</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex-1 text-center">
              <p className="text-muted-foreground mb-0.5">{t("common.to")}</p>
              <p className="font-semibold">
                {selected.to
                  ? fmtDate(cairoDateISO(selected.to.y, selected.to.m, selected.to.d))
                  : hovered
                    ? fmtDate(cairoDateISO(hovered.y, hovered.m, hovered.d))
                    : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-muted">
              <ChevronLeft size={14} className="rtl:rotate-180" />
            </button>
            <span className="text-sm font-semibold">{monthName}</span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-muted">
              <ChevronRight size={14} className="rtl:rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {weekdayNames.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const dn = year * 10000 + month * 100 + d;
              const isFuture = dn > todayNum;
              const isToday = dn === todayNum;
              const isStart = fromNum !== null && dn === fromNum;
              const isEnd = toNum_ !== null && fromNum !== null && dn === toNum_;
              const lo = fromNum !== null && toNum_ !== null ? Math.min(fromNum, toNum_) : null;
              const hi = fromNum !== null && toNum_ !== null ? Math.max(fromNum, toNum_) : null;
              const inRange = lo !== null && hi !== null && dn > lo && dn < hi;

              return (
                <div
                  key={i}
                  className={cn(
                    "relative flex items-center justify-center h-8",
                    inRange && "bg-primary/10",
                    isStart && "bg-primary/10 rounded-s-full",
                    isEnd && "bg-primary/10 rounded-e-full",
                    isStart && !selected.to && !hovered && "rounded-full",
                  )}
                >
                  <button
                    disabled={isFuture}
                    onClick={() => !isFuture && handleSelect({ y: year, m: month, d })}
                    onMouseEnter={() => !isFuture && setHovered({ y: year, m: month, d })}
                    onMouseLeave={() => setHovered(undefined)}
                    className={cn(
                      "w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center",
                      isFuture && "text-muted-foreground/30 cursor-not-allowed",
                      !isFuture && !isStart && !isEnd && "hover:bg-muted",
                      isToday && !isStart && !isEnd && "border border-primary text-primary",
                      (isStart || isEnd) && "bg-primary text-primary-foreground font-semibold shadow-sm",
                    )}
                  >
                    {d}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {!selected.from ? t("datePicker.clickStart") : !selected.to ? t("datePicker.clickEnd") : t("datePicker.rangeSelected")}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={handleApply} disabled={!selected.from}>
                {t("datePicker.apply")}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
