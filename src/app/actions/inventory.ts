"use server"

import { auth } from "@/lib/auth"
import { inboundSchema, adjustmentSchema, bulkInboundSchema } from "@/schemas/inventory"
import { InventoryService } from "@/services/inventory.service"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { Prisma, TransactionType } from "@prisma/client"
import crypto from "crypto"

function generateShortId() {
  return crypto.randomBytes(4).toString("hex").toUpperCase()
}

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

export async function processBulkInboundAction(rows: unknown[]) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }
    if (session.user.role !== "ADMIN") {
      return { success: false, message: "Forbidden: Only ADMIN can perform bulk inbound" }
    }

    // STRICT server-side Zod re-validation — reject entire payload if any row is invalid
    const validation = bulkInboundSchema.safeParse(rows)
    if (!validation.success) {
      const errors = validation.error.issues.map(issue => {
        const rowIndex = typeof issue.path[0] === "number" ? issue.path[0] : null
        const field = issue.path[1] || "unknown"
        const rowLabel = rowIndex !== null ? `Row ${rowIndex + 2}` : "Unknown row"
        return `${rowLabel}: '${String(field)}' — ${issue.message}`
      })
      return {
        success: false,
        message: `Upload rejected: ${validation.error.issues.length} validation error(s) found. Entire file blocked.`,
        details: { successCount: 0, errorCount: validation.error.issues.length, errors: errors.slice(0, 20) },
      }
    }

    const validatedRows = validation.data

    if (validatedRows.length > 500) {
      return { success: false, message: "Maximum 500 rows per import" }
    }

    // Atomic transaction — all rows succeed or entire batch rolls back
    const userId = session.user.id
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < validatedRows.length; i++) {
        const row = validatedRows[i]

        // Find existing SKU
        let outsole = await tx.outsole.findFirst({
          where: {
            model: row.Model.trim().toUpperCase(),
            article: row.Article.trim().toUpperCase(),
            color: row.Color.trim().toUpperCase(),
            size: row.Size.trim().toUpperCase(),
            poNumber: row.PONumber || "-",
            bottomTreatment: row.BottomTreatment || "None",
          }
        })

        const beforeData = outsole ? { stock: outsole.stock } : null

        if (outsole) {
          // Update existing stock
          outsole = await tx.outsole.update({
            where: { id: outsole.id },
            data: {
              stock: { increment: row.Stock },
              ...(row.Notes && { notes: row.Notes }),
            }
          })
        } else {
          // Create new SKU
          const shortId = generateShortId()
          outsole = await tx.outsole.create({
            data: {
              qrCode: `OSL-${shortId}`,
              model: row.Model.trim().toUpperCase(),
              article: row.Article.trim().toUpperCase(),
              color: row.Color.trim().toUpperCase(),
              size: row.Size.trim().toUpperCase(),
              poNumber: row.PONumber || "-",
              bottomTreatment: row.BottomTreatment || "None",
              notes: row.Notes || null,
              stock: row.Stock,
            }
          })
        }

        // Record transaction
        await tx.transaction.create({
          data: {
            outsoleId: outsole.id,
            userId,
            type: TransactionType.INBOUND,
            qty: row.Stock,
            notes: row.Notes || `Bulk import row ${i + 2}`,
          }
        })

        // Record audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: beforeData ? "STOCK_IN" : "CREATE",
            entityName: "Outsole",
            entityId: outsole.id,
            beforeData: beforeData ? (beforeData as Prisma.InputJsonValue) : undefined,
            afterData: { stock: outsole.stock },
          }
        })
      }
    }, {
      timeout: 120000, // 2 minute timeout for large imports
    })

    revalidatePath("/")
    revalidatePath("/inbound")
    revalidatePath("/inventory")

    return {
      success: true,
      message: `Import complete: All ${validatedRows.length} rows imported successfully.`,
      details: { successCount: validatedRows.length, errorCount: 0, errors: [] },
    }
  } catch (error) {
    console.error("Bulk Inbound Error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process bulk inbound. Entire transaction rolled back.",
      details: { successCount: 0, errorCount: 1, errors: [error instanceof Error ? error.message : "Unknown database error"] },
    }
  }
}

