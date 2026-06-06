"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"

export async function getBpmTfmStocks() {
  const data = await prisma.bpmTfmStock.findMany({
    orderBy: [
      { codeLast: "asc" },
      { toolName: "asc" },
      { type: "asc" },
      { size: "asc" },
    ],
  })
  return data
}

export async function importBpmTfmFlatCSVAction(
  rows: Record<string, string>[]
) {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("EDIT_INVENTORY") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: Anda tidak memiliki izin untuk mengedit stok" }
    }

    const validRecords: { codeLast: string; toolName: string; type: string; size: string; devStock: number }[] = []

    for (const row of rows) {
      const codeLast = row["Code Last"]?.trim()
      const toolName = row["Tool Name"]?.trim().toUpperCase()
      const type = row["Type"]?.trim().toUpperCase() || ""
      const size = row["Size"]?.trim().toUpperCase()
      const rawStock = row["Dev Stock"]?.trim()

      if (!codeLast || !toolName || !size) continue

      if (rawStock !== "" && rawStock !== undefined && !isNaN(Number(rawStock))) {
        validRecords.push({
          codeLast,
          toolName,
          type,
          size,
          devStock: parseInt(rawStock, 10),
        })
      }
    }

    if (validRecords.length === 0) {
      return { success: false, message: "Tidak ada data valid yang dapat diimpor (pastikan Dev Stock diisi angka valid, termasuk 0)." }
    }

    await prisma.$transaction(async (tx) => {
      for (const record of validRecords) {
        await tx.bpmTfmStock.upsert({
          where: {
            codeLast_toolName_type_size: {
              codeLast: record.codeLast,
              toolName: record.toolName,
              type: record.type,
              size: record.size,
            },
          },
          update: {
            devStock: record.devStock,
          },
          create: {
            codeLast: record.codeLast,
            toolName: record.toolName,
            type: record.type,
            size: record.size,
            devStock: record.devStock,
          },
        })
      }
    }, {
      timeout: 60000,
    })

    revalidatePath("/dashboard/bpm-tfm")
    return { success: true, message: `Berhasil mengimpor ${validRecords.length} data stok!` }
  } catch (error) {
    console.error("BPM/TFM CSV Import Error:", error)
    return { success: false, message: String(error) }
  }
}

export async function deleteBpmTfmStockAction(id: string) {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("EDIT_INVENTORY") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: Anda tidak memiliki izin untuk mengedit stok" }
    }

    await prisma.bpmTfmStock.delete({ where: { id } })
    revalidatePath("/bpm-tfm")
    return { success: true }
  } catch (error) {
    console.error("Delete BPM/TFM stock error:", error)
    return { success: false, message: String(error) }
  }
}

export async function addBpmTfmBatchAction(
  codeLast: string,
  items: { toolName: string; type: string; size: string; devStock: number }[]
) {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("EDIT_INVENTORY") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: Anda tidak memiliki izin untuk mengedit stok" }
    }

    // Filter out rows with no stock data
    const validItems = items.filter((item) => item.devStock > 0 && item.size.trim() !== "")

    if (validItems.length === 0) {
      return { success: false, message: "Tidak ada data yang valid untuk disimpan. Pastikan minimal satu baris memiliki Size dan Dev Stock > 0." }
    }

    await prisma.$transaction(async (tx) => {
      for (const item of validItems) {
        await tx.bpmTfmStock.upsert({
          where: {
            codeLast_toolName_type_size: {
              codeLast: codeLast.trim(),
              toolName: item.toolName.trim().toUpperCase(),
              type: item.type.trim().toUpperCase(),
              size: item.size.trim().toUpperCase(),
            },
          },
          update: {
            devStock: item.devStock,
          },
          create: {
            codeLast: codeLast.trim(),
            toolName: item.toolName.trim().toUpperCase(),
            type: item.type.trim().toUpperCase(),
            size: item.size.trim().toUpperCase(),
            devStock: item.devStock,
          },
        })
      }
    }, {
      timeout: 30000,
    })

    revalidatePath("/bpm-tfm")
    return { success: true, message: `Berhasil menyimpan ${validItems.length} tool untuk Code Last ${codeLast}.` }
  } catch (error) {
    console.error("Add BPM/TFM Batch Error:", error)
    return { success: false, message: String(error) }
  }
}

export async function updateBpmTfmStockAction(id: string, devStock: number) {
  try {
    const session = await auth()
    if (!session || (!session.user.permissions?.includes("EDIT_INVENTORY") && session.user.role !== "SUPER_ADMIN")) {
      return { success: false, message: "Unauthorized Access: Anda tidak memiliki izin untuk mengedit stok" }
    }

    await prisma.bpmTfmStock.update({
      where: { id },
      data: { devStock },
    })
    revalidatePath("/bpm-tfm")
    return { success: true }
  } catch (error) {
    console.error("Update BPM/TFM stock error:", error)
    return { success: false, message: String(error) }
  }
}

