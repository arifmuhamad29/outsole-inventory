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
