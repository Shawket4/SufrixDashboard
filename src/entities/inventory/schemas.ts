import { z } from "zod";
import { INVENTORY_UNITS } from "@/shared/config/constants";

export const catalogSchema = z.object({
  name: z.string().trim().min(1),
  unit: z.enum(INVENTORY_UNITS),
  category: z.string().trim().default("general"),
  description: z.string().trim().nullish().or(z.literal("")),
  cost_per_unit: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});
export type CatalogValues = z.infer<typeof catalogSchema>;

export const addStockSchema = z.object({
  org_ingredient_id: z.string().min(1),
  current_stock: z.coerce.number().min(0).default(0),
  reorder_threshold: z.coerce.number().min(0).default(0),
});
export type AddStockValues = z.infer<typeof addStockSchema>;

export const adjustmentSchema = z.object({
  branch_inventory_id: z.string().min(1),
  adjustment_type: z.enum(["add", "remove"]),
  quantity: z.coerce.number().positive(),
  note: z.string().trim().min(1),
});
export type AdjustmentValues = z.infer<typeof adjustmentSchema>;

export const transferSchema = z
  .object({
    source_branch_id: z.string().min(1),
    destination_branch_id: z.string().min(1),
    org_ingredient_id: z.string().min(1),
    quantity: z.coerce.number().positive(),
    note: z.string().trim().nullish().or(z.literal("")),
  })
  .refine((v) => v.source_branch_id !== v.destination_branch_id, {
    message: "Source and destination must differ",
    path: ["destination_branch_id"],
  });
export type TransferValues = z.infer<typeof transferSchema>;
