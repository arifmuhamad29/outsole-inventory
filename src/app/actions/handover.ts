"use server"

import prisma from "@/lib/prisma"

export async function getRealTimeStock(
  codeLast: string,
  toolName: string,
  type: string,
  size: string
): Promise<number> {
  if (!codeLast || !toolName || !size) return 0

  try {
    const stockRecord = await prisma.bpmTfmStock.findUnique({
      where: {
        codeLast_toolName_type_size: {
          codeLast: codeLast.trim(),
          toolName: toolName.trim().toUpperCase(),
          type: type.trim().toUpperCase(),
          size: size.trim().toUpperCase(),
        },
      },
      select: {
        devStock: true,
      },
    })
    
    return stockRecord ? stockRecord.devStock : 0
  } catch (error) {
    console.error("Error fetching real-time stock:", error)
    return 0
  }
}

export async function getAvailableSizesAction(
  codeLast: string,
  toolName: string,
  type: string | null
): Promise<string[]> {
  if (!codeLast || !toolName) return []

  try {
    const records = await prisma.bpmTfmStock.findMany({
      where: {
        codeLast: codeLast.trim(),
        toolName: toolName.trim().toUpperCase(),
        ...(type ? { type: type.trim().toUpperCase() } : {}),
      },
      select: {
        size: true,
      },
      distinct: ["size"],
      orderBy: {
        size: "asc",
      },
    })
    
    return records.map((r) => r.size)
  } catch (error) {
    console.error("Error fetching available sizes:", error)
    return []
  }
}

export async function getShoeModels(): Promise<string[]> {
  try {
    const models = await prisma.shoeModel.findMany({
      select: { name: true },
      orderBy: { name: "asc" }
    })
    
    return models.map(m => m.name)
  } catch (error) {
    console.error("Error fetching shoe models:", error)
    return []
  }
}

export async function getUniqueCodeLasts(): Promise<string[]> {
  try {
    const bpmStocks = await prisma.bpmTfmStock.findMany({
      select: { codeLast: true },
      distinct: ["codeLast"],
      orderBy: { codeLast: "asc" }
    })
    
    return bpmStocks.map(b => b.codeLast)
  } catch (error) {
    console.error("Error fetching code lasts:", error)
    return []
  }
}

import { revalidatePath } from "next/cache"

type HandoverItemPayload = {
  toolName: string
  type?: string
  size?: string
  satuan?: string
  qtyHandover: number
  remark?: string
}

type HandoverPayload = {
  date: string
  recipient: string
  giver?: string
  modelName?: string
  codeLast?: string
  items: HandoverItemPayload[]
}

export async function submitHandoverAction(data: HandoverPayload): Promise<{ success: boolean; message: string }> {
  try {
    const { date, recipient, giver = "SYSTEM", modelName, codeLast, items } = data

    await prisma.$transaction(async (tx) => {
      // 1. Create the master Handover record
      const handover = await tx.handover.create({
        data: {
          date: new Date(date),
          recipient,
          giver,
          modelName: modelName || null,
          codeLast: codeLast || null,
        }
      })

      // 2. Loop through items
      for (const item of items) {
        // Create HandoverItem
        await tx.handoverItem.create({
          data: {
            handoverId: handover.id,
            toolName: item.toolName,
            type: item.type || "",
            size: item.size || "",
            satuan: item.satuan || "SET",
            qty: item.qtyHandover,
            remark: item.remark || null,
          }
        })

        // 3. Stock Deduction for tracked tools
        const isStockTracked = ["BPM", "TFM", "UNIVERSAL PAD"].includes(item.toolName)
        if (isStockTracked && codeLast && item.size) {
          // Check if stock exists and is sufficient
          const stockRecord = await tx.bpmTfmStock.findUnique({
            where: {
              codeLast_toolName_type_size: {
                codeLast: codeLast.trim(),
                toolName: item.toolName.trim().toUpperCase(),
                type: (item.type || "").trim().toUpperCase(),
                size: item.size.trim().toUpperCase()
              }
            }
          })

          if (!stockRecord || stockRecord.devStock < item.qtyHandover) {
            throw new Error(`Stok tidak mencukupi untuk ${item.toolName} ukuran ${item.size}`)
          }

          // Decrement stock atomically
          await tx.bpmTfmStock.update({
            where: {
              codeLast_toolName_type_size: {
                codeLast: codeLast.trim(),
                toolName: item.toolName.trim().toUpperCase(),
                type: (item.type || "").trim().toUpperCase(),
                size: item.size.trim().toUpperCase()
              }
            },
            data: {
              devStock: { decrement: item.qtyHandover }
            }
          })
        }
      }
    })

    revalidatePath("/(dashboard)/handover")
    revalidatePath("/(dashboard)/bpm-tfm")
    
    return { success: true, message: "Handover berhasil disimpan" }
  } catch (error: unknown) {
    console.error("Submit handover error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan handover" }
  }
}

export async function getHandoversAction() {
  try {
    const handovers = await prisma.handover.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    
    // Format to plain objects if needed, but Prisma findMany returns plain objects.
    return handovers
  } catch (error) {
    console.error("Error fetching handovers:", error)
    return []
  }
}

export async function deleteHandoverAction(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Get the handover with items
      const handover = await tx.handover.findUnique({
        where: { id },
        include: { items: true },
      })

      if (!handover) {
        throw new Error("Handover tidak ditemukan")
      }

      // 2. Revert stock
      for (const item of handover.items) {
        const isStockTracked = ["BPM", "TFM", "UNIVERSAL PAD"].includes(item.toolName)
        if (isStockTracked && handover.codeLast && item.size) {
          // Increment stock atomically
          await tx.bpmTfmStock.updateMany({
            where: {
              codeLast: handover.codeLast.trim(),
              toolName: item.toolName.trim().toUpperCase(),
              type: (item.type || "").trim().toUpperCase(),
              size: item.size.trim().toUpperCase()
            },
            data: {
              devStock: { increment: item.qty }
            }
          })
        }
      }

      // 3. Delete handover
      await tx.handover.delete({
        where: { id }
      })
    })

    revalidatePath("/(dashboard)/handover")
    revalidatePath("/(dashboard)/bpm-tfm")
    
    return { success: true, message: "Handover berhasil dihapus dan stok dikembalikan" }
  } catch (error: unknown) {
    console.error("Delete handover error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus handover" }
  }
}
