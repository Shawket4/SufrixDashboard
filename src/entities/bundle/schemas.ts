import { z } from "zod";
import type { TFunction } from "i18next";

// Coerces an empty/whitespace-only string to undefined so the field is
// omitted from the JSON body entirely. Serde's Option<NaiveTime|NaiveDate>
// cannot deserialize an empty string and throws "premature end of input".
const optionalStr = z
  .string()
  .transform((v) => (v.trim() === "" ? undefined : v))
  .optional();

// Same as optionalStr but pads "HH:MM" → "HH:MM:SS" so the Rust
// NaiveTime deserialiser is happy with time picker values.
const optionalTime = z
  .string()
  .transform((v) => {
    const trimmed = v.trim();
    if (trimmed === "") return undefined;
    return /^\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
  })
  .optional();

export const createBundleSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, t("bundles.validation.nameRequired")),
    description: z
      .string()
      .transform((v) => (v.trim() === "" ? undefined : v))
      .optional(),
    price: z.union([z.string(), z.number()]).transform((v, ctx) => {
      const n = typeof v === "number" ? v : parseFloat(String(v));
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("bundles.validation.invalidPrice") });
        return z.NEVER;
      }
      return Math.round(n * 100);
    }),
    display_order: z.coerce.number().int().min(0).default(0),

    available_from_time: optionalTime,
    available_until_time: optionalTime,
    available_from_date: optionalStr,
    available_until_date: optionalStr,

    components: z
      .array(
        z.object({
          item_id: z.string().min(1, t("bundles.validation.itemRequired")),
          quantity: z.coerce.number().int().min(1, t("bundles.validation.quantityMin")),
          position: z.number().int().optional(),
        }),
      )
      .min(2, t("bundles.validation.componentsMin"))
      .max(6, t("bundles.validation.componentsMax"))
      .refine(
        (items) => {
          const ids = items.map((it) => it.item_id);
          return new Set(ids).size === ids.length;
        },
        {
          message: t("bundles.validation.duplicateItems"),
          path: [0, "item_id"],
        },
      ),

    branch_ids: z.array(z.string()).default([]),
  });

export type BundleFormValues = z.infer<ReturnType<typeof createBundleSchema>>;
