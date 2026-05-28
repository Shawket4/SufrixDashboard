import { APP_TZ, DEFAULT_CURRENCY, DEFAULT_LOCALE_AR, DEFAULT_LOCALE_EN } from "@/shared/config/constants";
import i18n from "@/shared/i18n";
import { TZDate } from "@date-fns/tz";

type Lang = "en" | "ar";

const getLocale = (): string => {
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? "en") as Lang;
  return lang === "ar" ? DEFAULT_LOCALE_AR : DEFAULT_LOCALE_EN;
};

const withTZ = (opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions => ({
  ...opts,
  timeZone: APP_TZ,
});

// ── Money ────────────────────────────────────────────────────────────────────

/** Convert piastres (integer) → EGP number (float) */
export const piastresToEgp = (p: number): number => (p ?? 0) / 100;

/** Format piastres as currency in user's locale */
export const fmtMoney = (piastres: number | null | undefined, opts?: { fractionDigits?: 0 | 2 }): string => {
  const value = piastresToEgp(piastres ?? 0);
  const fd = opts?.fractionDigits ?? 2;
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: fd,
    maximumFractionDigits: fd,
  }).format(value);
};

/** Compact variant — "EGP 1.2K" style */
export const fmtMoneyCompact = (piastres: number | null | undefined): string => {
  const value = piastresToEgp(piastres ?? 0);
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

/** Plain number in locale */
export const fmtNumber = (n: number | null | undefined, opts?: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat(getLocale(), opts).format(n ?? 0);

/** Percent with 1 decimal place */
export const fmtPercent = (ratio: number): string =>
  new Intl.NumberFormat(getLocale(), { style: "percent", maximumFractionDigits: 1 }).format(ratio);

/** Safe share of a part over total */
export const fmtShare = (part: number, total: number): string => {
  if (!total) return fmtPercent(0);
  return fmtPercent(part / total);
};

// ── Dates ────────────────────────────────────────────────────────────────────

export const fmtDate = (iso: string | Date | null | undefined): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(
    getLocale(),
    withTZ({ day: "2-digit", month: "short", year: "numeric" }),
  ).format(new Date(iso));
};

export const fmtTime = (iso: string | Date | null | undefined): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(
    getLocale(),
    withTZ({ hour: "2-digit", minute: "2-digit" }),
  ).format(new Date(iso));
};

export const fmtDateTime = (iso: string | Date | null | undefined): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(
    getLocale(),
    withTZ({ day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
  ).format(new Date(iso));
};

export const fmtDateTimeFull = (iso: string | Date | null | undefined): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(
    getLocale(),
    withTZ({
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  ).format(new Date(iso));
};

export const fmtDuration = (start: string | null | undefined, end?: string | null): string => {
  if (!start) return "—";
  const ms = new Date(end ?? Date.now()).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms)) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/** Return Cairo "today" and "now" helpers — useful for date range logic */
export const cairoNow = (): TZDate => new TZDate(Date.now(), APP_TZ);

/** ISO for Cairo calendar day (start or end) in UTC */
export const cairoDateISO = (year: number, month: number, day: number, endOfDay = false): string => {
  const d = new TZDate(
    year,
    month,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
    APP_TZ
  );
  return d.toISOString();
};

/** Extract Cairo calendar parts {y,m,d} from an ISO string */
export const cairoParts = (iso: string): { y: number; m: number; d: number } => {
  const d = new TZDate(iso, APP_TZ);
  return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
};

/** Format a period timestamp for charts based on granularity */
export const fmtPeriod = (iso: string, granularity: "hourly" | "daily" | "monthly"): string => {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions =
    granularity === "hourly"
      ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }
      : granularity === "monthly"
        ? { month: "short", year: "numeric" }
        : { month: "short", day: "numeric" };
  return new Intl.DateTimeFormat(getLocale(), withTZ(opts)).format(d);
};

// ── Miscellaneous ────────────────────────────────────────────────────────────

export const initials = (name = ""): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export const fmtUnit = (unit: string | null | undefined): string => {
  const map: Record<string, string> = { g: "g", kg: "kg", ml: "ml", l: "L", pcs: "pcs" };
  return unit ? (map[unit] ?? unit) : "";
};
