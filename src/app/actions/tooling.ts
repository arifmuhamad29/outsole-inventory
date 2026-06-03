"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updateToolingPhaseStatus(phaseId: string, newStatus: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR") {
      return { success: false, message: "Forbidden" }
    }

    const phase = await prisma.toolingPhase.findUnique({
      where: { id: phaseId },
    })

    if (!phase) {
      return { success: false, message: "Phase not found" }
    }

    const dataToUpdate: import("@prisma/client").Prisma.ToolingPhaseUpdateInput = { status: newStatus }

    // Automatically set actualETA to today when status changes to VERIFIED
    if (newStatus === "VERIFIED" && phase.status !== "VERIFIED") {
      dataToUpdate.actualETA = new Date()
    }

    await prisma.toolingPhase.update({
      where: { id: phaseId },
      data: dataToUpdate,
    })

    revalidatePath("/tooling")
    return { success: true, message: "Status updated successfully" }
  } catch (error) {
    console.error("Update Tooling Status Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to update status" }
  }
}

export async function updateModelToolingAction(modelId: string, payload: { 
  phases: { id: string, qty: string | null, orderDate: string | null, targetETA: string | null, actualETA: string | null, status: string }[],
  items: { id: string, remark: string | null }[]
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR") {
      return { success: false, message: "Forbidden" }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Tooling Phases
      for (const phase of payload.phases) {
        // Parse dates strings into Date objects
        const pOrderDate = phase.orderDate ? new Date(phase.orderDate) : null
        const pTargetETA = phase.targetETA ? new Date(phase.targetETA) : null
        let pActualETA = phase.actualETA ? new Date(phase.actualETA) : null

        // If status is verified but no actual ETA is set, autofill it
        if (phase.status === "VERIFIED" && !pActualETA) {
          pActualETA = new Date()
        }

        await tx.toolingPhase.update({
          where: { id: phase.id },
          data: {
            qty: phase.qty,
            orderDate: pOrderDate,
            targetETA: pTargetETA,
            actualETA: pActualETA,
            status: phase.status,
          }
        })
      }

      // 2. Update Tooling Items (Remarks)
      for (const item of payload.items) {
        await tx.toolingItem.update({
          where: { id: item.id },
          data: {
            remark: item.remark
          }
        })
      }

      // 3. Update Model lastUpdated timestamp
      await tx.shoeModel.update({
        where: { id: modelId },
        data: { lastUpdated: new Date() }
      })
    }, {
      timeout: 30000 // Allow up to 30s for the transaction
    })

    revalidatePath("/tooling")
    return { success: true, message: "Perubahan berhasil disimpan!" }
  } catch (error) {
    console.error("Batch update Tooling Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Gagal menyimpan perubahan" }
  }
}
