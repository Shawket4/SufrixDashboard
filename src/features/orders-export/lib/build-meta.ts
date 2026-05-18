import type { TFunction } from "i18next";
import { fmtDate } from "@/shared/lib/format";

export function buildMeta(args: {
  branchName: string;
  from: string | null;
  to: string | null;
  payment: string | null;
  status: string | null;
  shiftLabel: string | null;
  t: TFunction;
}): string {
  const parts: string[] = [];
  parts.push(`${args.t("orders.branch")}: ${args.branchName}`);
  if (args.from && args.to) {
    parts.push(`${fmtDate(args.from)} → ${fmtDate(args.to)}`);
  } else {
    parts.push(args.t("orders.allTime"));
  }
  if (args.payment) parts.push(args.t(`payments.${args.payment}`));
  if (args.status) parts.push(args.t(`orderStatus.${args.status}`));
  if (args.shiftLabel) parts.push(`${args.t("orders.shift")}: ${args.shiftLabel}`);
  return parts.join(" · ");
}
