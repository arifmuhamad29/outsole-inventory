"use server"

import { auth } from "@/lib/auth"
import { inboundSchema, adjustmentSchema } from "@/schemas/inventory"
import { InventoryService } from "@/services/inventory.service"
import { revalidatePath } from "next/cache"

export async function processInboundAction(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }
    if (session.user.role !== "ADMIN") {
      return { success: false, message: "Forbidden: Only ADMIN can perform inbound" }
    }

    const data = {
      model: formData.get("model") as string,
      article: formData.get("article") as string,
      color: formData.get("color") as string,
      poNumber: formData.get("poNumber") as string || "-",
      bottomTreatment: formData.get("bottomTreatment") as string || "None",
      size: formData.get("size") as string,
      qty: Number(formData.get("qty")),
      notes: formData.get("notes") as string | undefined,
    }

    const parsed = inboundSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, message: "Invalid input data", errors: parsed.error.flatten().fieldErrors }
    }

    const result = await InventoryService.processInbound(parsed.data, session.user.id)
    revalidatePath("/")
    revalidatePath("/inbound")

    return { success: true, message: "Inbound processed successfully", data: { ...result, notes: parsed.data.notes } }
  } catch (error) {
    console.error("Inbound Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to process inbound" }
  }
}

export async function processAdjustmentAction(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }
    if (session.user.role !== "ADMIN") {
      return { success: false, message: "Forbidden: Only ADMIN can perform adjustment" }
    }

    const data = {
      outsoleId: formData.get("outsoleId") as string,
      newStock: Number(formData.get("newStock")),
      notes: formData.get("notes") as string,
    }

    const parsed = adjustmentSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, message: "Invalid input data", errors: parsed.error.flatten().fieldErrors }
    }

    const result = await InventoryService.processAdjustment(parsed.data, session.user.id)
    revalidatePath("/")
    revalidatePath("/adjustment")

    return { success: true, message: "Stock adjusted successfully", data: result }
  } catch (error) {
    console.error("Adjustment Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to adjust stock" }
  }
}

export async function hardDeleteOutsoleAction(id: string, password?: string) {
  try {
    if (!password) return { success: false, message: "Password is required" }

    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }
    if (session.user.role !== "ADMIN") return { success: false, message: "Forbidden: Only ADMIN can delete permanently" }

    await InventoryService.hardDeleteOutsole(id, session.user.id, password)
    revalidatePath("/")
    revalidatePath("/opname")
    
    return { success: true, message: "Item permanently deleted" }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to delete" }
  }
}

interface BulkInboundRow {
  Model: string
  Article: string
  Color: string
  Size: string
  Stock: string
  PONumber?: string
  BottomTreatment?: string
  Notes?: string
}

export async function processBulkInboundAction(rows: BulkInboundRow[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }
    if (session.user.role !== "ADMIN") {
      return { success: false, message: "Forbidden: Only ADMIN can perform bulk inbound" }
    }

    if (!rows || rows.length === 0) {
      return { success: false, message: "No data to import" }
    }

    if (rows.length > 500) {
      return { success: false, message: "Maximum 500 rows per import" }
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 because row 1 is header

      if (!row.Model || !row.Article || !row.Color || !row.Size || !row.Stock) {
        errors.push(`Row ${rowNum}: Missing required fields (Model, Article, Color, Size, Stock)`)
        errorCount++
        continue
      }

      const qty = parseInt(row.Stock)
      if (isNaN(qty) || qty <= 0) {
        errors.push(`Row ${rowNum}: Invalid stock value "${row.Stock}"`)
        errorCount++
        continue
      }

      try {
        const validBottomTreatments = ["Spray", "Spackle", "Marble", "None"] as const
        const rawBt = row.BottomTreatment?.trim() || "None"
        const bottomTreatment = validBottomTreatments.includes(rawBt as typeof validBottomTreatments[number])
          ? (rawBt as typeof validBottomTreatments[number])
          : "None"

        await InventoryService.processInbound(
          {
            model: row.Model.trim().toUpperCase(),
            article: row.Article.trim().toUpperCase(),
            color: row.Color.trim().toUpperCase(),
            size: row.Size.trim().toUpperCase(),
            qty,
            poNumber: row.PONumber?.trim() || "-",
            bottomTreatment,
            notes: row.Notes?.trim() || `Bulk import row ${rowNum}`,
          },
          session.user.id
        )
        successCount++
      } catch (err) {
        errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : "Unknown error"}`)
        errorCount++
      }
    }

    revalidatePath("/")
    revalidatePath("/inbound")
    revalidatePath("/inventory")

    return {
      success: true,
      message: `Import complete: ${successCount} succeeded, ${errorCount} failed out of ${rows.length} rows.`,
      details: { successCount, errorCount, errors: errors.slice(0, 20) },
    }
  } catch (error) {
    console.error("Bulk Inbound Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to process bulk inbound" }
  }
}
