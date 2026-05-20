import { z } from "zod";
import { egpToPiastres } from "@/shared/lib/zod-utils";

// Coerces an empty/whitespace-only string to undefined so the field is
// omitted from the JSON body entirely. Serde's Option<NaiveTime|NaiveDate>
// cannot deserialize an empty string and throws "premature end of input".
const optionalStr = z
  .string()
  .transform((v) => (v.trim() === "" ? undefined : v))
  .optional();

// Same as optionalStr but pads "HH:MM" → "HH:MM:SS" so the Rust
// NaiveTime deserialiser is happy with native <input type="time"> values.
const optionalTime = z
  .string()
  .transform((v) => {
    const trimmed = v.trim();
    if (trimmed === "") return undefined;
    // Native time inputs return "HH:MM"; backend needs "HH:MM:SS"
    return /^\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
  })
  .optional();

export const bundleSchema = z.object({
  name: z.string().trim().min(1, "Bundle name is required"),
  description: z
    .string()
    .transform((v) => (v.trim() === "" ? undefined : v))
    .optional(),
  price: egpToPiastres, // EGP String input -> piastres integer on submit
  display_order: z.coerce.number().int().min(0).default(0),

  available_from_time:  optionalTime,
  available_until_time: optionalTime,
  available_from_date:  optionalStr,
  available_until_date: optionalStr,


  components: z
    .array(
      z.object({
        item_id: z.string().min(1, "Menu item is required"),
        quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
        position: z.number().int().optional(),
      })
    )
    .min(2, "A bundle must contain at least 2 items")
    .max(6, "A bundle cannot contain more than 6 items")
    .refine(
      (items) => {
        const ids = items.map((it) => it.item_id);
        return new Set(ids).size === ids.length;
      },
      {
        message: "Duplicate menu items are not allowed in components",
        path: [0, "item_id"],
      }
    ),

  branch_ids: z.array(z.string()).default([]),
});

export type BundleFormValues = z.infer<typeof bundleSchema>;

