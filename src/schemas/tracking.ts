import { z } from "zod"

export const VALID_GENDER_CATEGORIES = ["Men", "Women", "Unisex", "Infant", "Kids/Jr"] as const
export type GenderCategory = typeof VALID_GENDER_CATEGORIES[number]

export function normalizeGender(val: string): GenderCategory | null {
  if (!val) return null
  const clean = val.trim().toLowerCase()
  if (clean === "men" || clean === "man" || clean === "pria") return "Men"
  if (clean === "women" || clean === "woman" || clean === "wanita") return "Women"
  if (clean === "unisex") return "Unisex"
  if (clean === "infant" || clean === "bayi") return "Infant"
  if (clean === "kids" || clean === "kids/jr" || clean === "jr" || clean === "anak" || clean === "junior") return "Kids/Jr"
  return null
}

export function normalizeOrderStatus(val?: string): { orderStatus: string; isOrdered: boolean } {
  if (!val) return { orderStatus: "NOT_ORDERED", isOrdered: false }
  const clean = val.trim().toUpperCase()
  if (clean === "ORDERED" || clean === "SUDAH ORDER") return { orderStatus: "ORDERED", isOrdered: true }
  if (clean === "ON_PAINTING_SUPPLIER" || clean === "PAINTING" || clean === "ON PAINTING SUPPLIER") return { orderStatus: "ON_PAINTING_SUPPLIER", isOrdered: true }
  if (clean === "DONE" || clean === "SELESAI") return { orderStatus: "DONE", isOrdered: true }
  return { orderStatus: "NOT_ORDERED", isOrdered: false }
}

export function normalizeBottomTreatment(val?: string): string | null {
  if (!val) return null
  const clean = val.trim().toLowerCase()
  if (clean === "spray") return "Spray"
  if (clean === "marble") return "Marble"
  if (clean === "spackle") return "Spackle"
  return null
}

// Bulk Tracking CSV Row Schema
export const bulkTrackingRowSchema = z.object({
  Season: z.string().optional().default(""),
  Article: z.string().min(1, "Article is required"),
  Model: z.string().min(1, "Model is required"),
  Gender: z.string().min(1, "Gender is required"),
  Size: z.string().min(1, "Size is required"),
  Quantity: z.preprocess((val) => Number(val), z.number().int().min(1, "Quantity must be at least 1")),
  PONumber: z.string().optional().default("-"),
  Supplier: z.string().optional().default(""),
  MidsoleColor: z.string().optional().default(""),
  MidsoleMaterial: z.string().optional().default(""),
  OutsoleColor: z.string().optional().default(""),
  OutsoleMaterial: z.string().optional().default(""),
  WedgeColor: z.string().optional().default(""),
  WedgeMaterial: z.string().optional().default(""),
  CRColor: z.string().optional().default(""),
  CRMaterial: z.string().optional().default(""),
  BottomTreatment: z.string().optional().default("None"),
  OrderStatus: z.string().optional().default("NOT_ORDERED"),
  Notes: z.string().optional().default(""),
})

export const bulkTrackingSchema = z.array(bulkTrackingRowSchema).min(1, "At least one row is required")

export type BulkTrackingRowData = z.infer<typeof bulkTrackingRowSchema>
