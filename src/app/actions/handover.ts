"use server"

import prisma from "@/lib/prisma"
import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { createNotification } from "./notification"

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
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("CREATE_HANDOVER") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: You do not have permission to create handovers" }
    }

    const actualGiver = session.user.username || session.user.name || "SYSTEM"
    const { date, recipient, modelName, codeLast, items } = data

    await prisma.$transaction(async (tx) => {
      // Generate unique unforgeable ID: HO-XXXXXX
      const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
      const customId = `HO-${randomString}`;

      // 1. Create the master Handover record
      const handover = await tx.handover.create({
        data: {
          id: customId,
          date: new Date(date),
          recipient,
          giver: actualGiver,
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

          // Deduct stock manually
          const deduction = Number(item.qtyHandover) || 0
          const updatedStock = stockRecord.devStock - deduction

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
              devStock: updatedStock
            }
          })
        }
      }
    })

    revalidatePath("/(dashboard)/handover")
    revalidatePath("/(dashboard)/bpm-tfm")

    await createNotification(
      "Handover Baru",
      `Handover ke ${data.recipient} (${data.items.length} item) berhasil dilakukan oleh ${session?.user?.name || "System"}.`,
      "success"
    );
    
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
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("DELETE_HANDOVER") && session.user.role !== "SUPER_ADMIN")) {
      throw new Error("Unauthorized Access: You do not have permission to delete handovers")
    }

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
          // Find the exact existing stock record
          const existingStock = await tx.bpmTfmStock.findFirst({
            where: {
              codeLast: handover.codeLast.trim(),
              toolName: item.toolName.trim().toUpperCase(),
              type: (item.type || "").trim().toUpperCase(),
              size: item.size.trim().toUpperCase()
            }
          })

          if (existingStock) {
            const addition = Number(item.qty) || 0
            const updatedStock = existingStock.devStock + addition

            await tx.bpmTfmStock.update({
              where: { id: existingStock.id },
              data: { devStock: updatedStock }
            })
          }
        }
      }

      // 3. Delete handover
      await tx.handover.delete({
        where: { id }
      })
    })

    revalidatePath("/(dashboard)/handover")
    revalidatePath("/(dashboard)/bpm-tfm")

    await createNotification(
      "Handover Dihapus",
      `Handover "${id}" telah dihapus dan stok dikembalikan.`,
      "warning"
    );
    
    return { success: true, message: "Handover berhasil dihapus dan stok dikembalikan" }
  } catch (error: unknown) {
    console.error("Delete handover error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus handover" }
  }
}


type OutsoleHandoverItemPayload = {
  model: string
  article: string
  color: string
  genderCategory: string
  stage: string
  remark: string
  sizes: Record<string, number>
}

type OutsoleHandoverPayload = {
  date: string
  recipient: string
  giver?: string
  items: OutsoleHandoverItemPayload[]
}

export async function submitOutsoleHandoverAction(data: OutsoleHandoverPayload): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("CREATE_HANDOVER") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: You do not have permission to create handovers" }
    }

    const actualGiver = session.user.username || session.user.name || "SYSTEM"
    const { date, recipient, items } = data

    await prisma.$transaction(async (tx) => {
      // Generate unique unforgeable ID: HO-XXXXXX
      const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
      const customId = `HO-${randomString}`;

      // 1. Create Handover
      const handover = await tx.handover.create({
        data: {
          id: customId,
          date: new Date(date),
          recipient,
          giver: actualGiver,
          modelName: "Outsole Handover",
          codeLast: "-",
        }
      })

      // 2. Loop through Outsole items and sizes
      for (const item of items) {
        const sizes = item.sizes || {}
        const enteredSizes = Object.entries(sizes).filter(([_, qty]) => Number(qty) > 0)

        for (const [sizeLabel, qty] of enteredSizes) {
          const itemType = `${item.model} - ${item.article} (${item.color}) | Gender: ${item.genderCategory}`;
          const itemSize = `Sz: ${sizeLabel} | Stage: ${item.stage}`;

          await tx.handoverItem.create({
            data: {
              handoverId: handover.id,
              toolName: "Outsole",
              type: itemType,
              size: itemSize,
              satuan: "PRS",
              qty: Number(qty),
              remark: item.remark || null,
            }
          })
        }
      }
    });

    revalidatePath("/handover");

    await createNotification(
      "Handover Outsole Berhasil",
      `${items.length} item outsole telah diserahterimakan kepada ${recipient} oleh ${actualGiver}.`,
      "success"
    );

    return { success: true, message: "Handover Outsole berhasil disimpan." };
  } catch (error) {
    console.error("Handover error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan internal",
    };
  }
}
