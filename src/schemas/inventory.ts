import { z } from "zod"

export const inboundSchema = z.object({
  model: z.string().min(1, "Model is required").toUpperCase(),
  article: z.string().min(1, "Article is required").toUpperCase(),
  color: z.string().min(1, "Color is required").toUpperCase(),
  poNumber: z.string().optional().default("-"),
  bottomTreatment: z.enum(["Spray", "Spackle", "Marble", "None"]).default("None"),
  size: z.string().min(1, "Size is required"),
  qty: z.coerce.number().int().positive("Quantity must be greater than zero"),
  notes: z.string().optional()
})

export type InboundData = z.infer<typeof inboundSchema>

export const outboundSchema = z.object({
  qrCode: z.string().min(1, "QR Code is required"),
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero").default(1),
  notes: z.string().optional()
})

export type OutboundData = z.infer<typeof outboundSchema>

export const adjustmentSchema = z.object({
  outsoleId: z.string().uuid("Valid Outsole ID is required"),
  newStock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  notes: z.string().min(5, "Reason for adjustment is required (min 5 characters)")
})

export type AdjustmentData = z.infer<typeof adjustmentSchema>

export const stockOpnameSessionSchema = z.object({
  sessionName: z.string().min(1, "Session name is required")
})

export const stockOpnameItemSchema = z.object({
  sessionId: z.string().uuid(),
  outsoleId: z.string().uuid(),
  physicalStock: z.coerce.number().int().min(0, "Stock cannot be negative")
})
