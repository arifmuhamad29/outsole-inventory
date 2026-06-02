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
