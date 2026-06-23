"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updateToolingPhaseStatus(phaseId: string, newStatus: string) {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("EDIT_TOOLING_MES") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: Anda tidak memiliki izin untuk mengedit tooling" }
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
  items: { id: string, name: string, remark: string | null, sortOrder: number }[],
  newItems?: {
    category: string,
    name: string,
    remark: string | null,
    sortOrder: number,
    phases: { phaseType: string, qty: string | null, orderDate: string | null, targetETA: string | null, actualETA: string | null, status: string }[]
  }[],
  deletedItemIds?: string[]
}) {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("EDIT_TOOLING_MES") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: Anda tidak memiliki izin untuk mengedit tooling" }
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

      // 2. Update Tooling Items (Name & Remarks) - TWO-PASS TRANSACTION to prevent Swap Collisions
      // PASS 1: Assign temporary names to bypass unique constraint during swaps
      for (const item of payload.items) {
        if (item.id) {
          await tx.toolingItem.update({
            where: { id: item.id },
            data: {
              name: `${item.name}_temp_${Math.random().toString(36).substring(7)}`,
            }
          })
        }
      }

      // PASS 2: Apply the final actual names and other fields
      for (const item of payload.items) {
        if (item.id) {
          await tx.toolingItem.update({
            where: { id: item.id },
            data: {
              name: item.name,
              remark: item.remark,
              sortOrder: item.sortOrder
            }
          })
        }
      }

      // 3. Create new Tooling Items (and nested phases)
      if (payload.newItems && payload.newItems.length > 0) {
        for (const newItem of payload.newItems) {
          // If name is completely empty and no phases have data, you could optionally skip it,
          // but we will insert whatever the user sent.
          await tx.toolingItem.create({
            data: {
              modelId,
              category: newItem.category,
              name: newItem.name || "Untitled Tooling",
              remark: newItem.remark,
              sortOrder: newItem.sortOrder,
              phases: {
                create: newItem.phases.map(p => {
                  const pOrderDate = p.orderDate ? new Date(p.orderDate) : null
                  const pTargetETA = p.targetETA ? new Date(p.targetETA) : null
                  let pActualETA = p.actualETA ? new Date(p.actualETA) : null
                  if (p.status === "VERIFIED" && !pActualETA) {
                    pActualETA = new Date()
                  }
                  
                  return {
                    phaseType: p.phaseType,
                    qty: p.qty,
                    orderDate: pOrderDate,
                    targetETA: pTargetETA,
                    actualETA: pActualETA,
                    status: p.status
                  }
                })
              }
            }
          })
        }
      }

      // 4. Delete items marked for deletion
      if (payload.deletedItemIds && payload.deletedItemIds.length > 0) {
        await tx.toolingItem.deleteMany({
          where: { id: { in: payload.deletedItemIds } }
        })
      }

      // 5. Update Model lastUpdated timestamp
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

const BOTTOM_DEFAULTS = [
  "GAUGE TOP NET",
  "GAUGE PART BOTTOM (O/S;M/S)",
  "SCRIBELINE",
  "TOE SPRING GAUGE",
  "TOOLING MOLD MIDSOLE",
]

const ASSEMBLY_DEFAULTS = [
  "3D GAUGE",
  "LAST",
  "BACK PART MOLD",
  "TOE FORMING",
  "GAUGE FOR SOCKLINER LOGO",
]

export async function createShoeModelAction(name: string) {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("EDIT_TOOLING_MES") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: Anda tidak memiliki izin untuk mengedit tooling" }
    }

    if (!name || name.trim() === "") {
      return { success: false, message: "Nama model tidak boleh kosong" }
    }

    const normalizedName = name.trim().toUpperCase()

    const existingModel = await prisma.shoeModel.findUnique({
      where: { name: normalizedName }
    })
    
    if (existingModel) {
      return { success: false, message: "Model dengan nama tersebut sudah ada" }
    }

    await prisma.$transaction(async (tx) => {
      const model = await tx.shoeModel.create({
        data: {
          name: normalizedName
        }
      })

      const allDefaults = [
        ...BOTTOM_DEFAULTS.map(d => ({ category: "BOTTOM TOOLING", name: d })),
        ...ASSEMBLY_DEFAULTS.map(d => ({ category: "ASSEMBLY TOOLING", name: d }))
      ]

      for (let i = 0; i < allDefaults.length; i++) {
        const def = allDefaults[i];
        await tx.toolingItem.create({
          data: {
            modelId: model.id,
            category: def.category,
            name: def.name,
            sortOrder: i,
            phases: {
              create: ["EXTREME", "FSR"].map(pt => ({
                phaseType: pt,
                status: "ON PROCESS"
              }))
            }
          }
        })
      }
    }, {
      timeout: 30000
    })

    revalidatePath("/tooling")
    return { success: true, message: "Model sepatu berhasil dibuat" }
  } catch (error) {
    console.error("Create Shoe Model Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Gagal membuat model" }
  }
}

export async function deleteShoeModelAction(id: string) {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("EDIT_TOOLING_MES") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: Anda tidak memiliki izin untuk mengedit tooling" }
    }

    await prisma.shoeModel.delete({
      where: { id }
    })

    revalidatePath("/tooling")
    return { success: true, message: "Model sepatu berhasil dihapus" }
  } catch (error) {
    console.error("Delete Shoe Model Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Gagal menghapus model" }
  }
}

export async function importSingleModelAction(modelName: string, rows: Record<string, string>[]) {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("EDIT_TOOLING_MES") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: Anda tidak memiliki izin untuk mengedit tooling" }
    }

    if (!modelName || !rows || rows.length === 0) {
      return { success: false, message: "Data tidak valid untuk model ini" }
    }

    // A. Upsert the master Shoe Model once per group
    const shoeModel = await prisma.shoeModel.upsert({
      where: { name: modelName },
      update: { lastUpdated: new Date() },
      create: { name: modelName, lastUpdated: new Date() }
    })

    // B. Upsert all tooling items and phases associated with this specific model
    for (const row of rows) {
      const category = row["Category"]?.trim()
      const toolingName = row["Tooling Name"]?.trim()
      const phaseType = row["Phase"]?.trim()?.toUpperCase()
      const qty = row["Qty"]?.trim() || null
      const orderDateStr = row["Order Date"]?.trim()
      const targetETAStr = row["Target ETA"]?.trim()
      const actualETAStr = row["Actual ETA"]?.trim()
      const status = row["Status"]?.trim()?.toUpperCase() || "ON PROCESS"
      const remark = row["Remark"]?.trim() || null

      // Skip if missing essential item info
      if (!category || !toolingName || !phaseType) continue

      // Parse dates carefully, handle empty or '-'
      const parseDate = (dStr: string | null | undefined) => {
        if (!dStr || dStr === "-" || dStr === "") return null
        const d = new Date(dStr)
        return isNaN(d.getTime()) ? null : d
      }

      const pOrderDate = parseDate(orderDateStr)
      const pTargetETA = parseDate(targetETAStr)
      let pActualETA = parseDate(actualETAStr)
      
      if (status === "VERIFIED" && !pActualETA) {
        pActualETA = new Date()
      }

      // Upsert ToolingItem
      const toolingItem = await prisma.toolingItem.upsert({
        where: { 
          modelId_name: {
            modelId: shoeModel.id,
            name: toolingName
          }
        },
        update: { category, remark },
        create: {
          modelId: shoeModel.id,
          category,
          name: toolingName,
          remark
        }
      })

      // Upsert ToolingPhase
      await prisma.toolingPhase.upsert({
        where: {
          itemId_phaseType: {
            itemId: toolingItem.id,
            phaseType: phaseType
          }
        },
        update: {
          qty,
          orderDate: pOrderDate,
          targetETA: pTargetETA,
          actualETA: pActualETA,
          status
        },
        create: {
          itemId: toolingItem.id,
          phaseType: phaseType,
          qty,
          orderDate: pOrderDate,
          targetETA: pTargetETA,
          actualETA: pActualETA,
          status
        }
      })
    }

    revalidatePath("/tooling")
    return { success: true, message: `Model ${modelName} berhasil diimpor` }
  } catch (error) {
    console.error(`CSV Import Error for ${modelName}:`, error)
    return { success: false, message: error instanceof Error ? error.message : `Gagal mengimpor model ${modelName}` }
  }
}
