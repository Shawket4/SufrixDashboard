import type { PresetId } from "../model/types";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildFilename(args: {
  presetId: PresetId;
  branchSlug: string;
  from: string | null;
  to: string | null;
}): string {
  const dateRange =
    args.from && args.to
      ? `${args.from.slice(0, 10)}_to_${args.to.slice(0, 10)}`
      : new Date().toISOString().slice(0, 10);
  return `${slugify(args.presetId)}-${args.branchSlug}-${dateRange}`;
}
