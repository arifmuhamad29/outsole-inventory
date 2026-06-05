"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

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

export async function importBpmTfmCSVAction(
  rows: Record<string, string>[]
) {
  try {
    const flatRecords: { codeLast: string; toolName: string; type: string; size: string; devStock: number }[] = []

    for (const row of rows) {
      const codeLast = row["Code Last"]?.trim()
      const sizeGroup = row["Size Group"]?.trim().toUpperCase()
      
      const rawHot = row["Qty BPM HOT"]?.trim()
      const rawChiller = row["Qty BPM CHILLER"]?.trim()
      const rawTfm = row["Qty TFM"]?.trim()
      const rawUniv = row["Qty UNIV PAD"]?.trim()

      if (!codeLast || !sizeGroup) continue

      const isValidStock = (val: string | undefined) => val !== "" && val !== undefined && !isNaN(Number(val))

      if (isValidStock(rawHot)) {
        flatRecords.push({ codeLast, toolName: "BPM", type: "HOT", size: sizeGroup, devStock: parseInt(rawHot as string, 10) })
      }
      if (isValidStock(rawChiller)) {
        flatRecords.push({ codeLast, toolName: "BPM", type: "CHILLER", size: sizeGroup, devStock: parseInt(rawChiller as string, 10) })
      }
      if (isValidStock(rawTfm)) {
        flatRecords.push({ codeLast, toolName: "TFM", type: "", size: sizeGroup, devStock: parseInt(rawTfm as string, 10) })
      }
      if (isValidStock(rawUniv)) {
        flatRecords.push({ codeLast, toolName: "UNIVERSAL PAD", type: "", size: "-", devStock: parseInt(rawUniv as string, 10) })
      }
    }

    if (flatRecords.length === 0) {
      return { success: false, message: "Tidak ada data valid yang dapat diimpor (pastikan Qty diisi angka valid, termasuk 0)." }
    }

    await prisma.$transaction(async (tx) => {
      for (const record of flatRecords) {
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

    revalidatePath("/bpm-tfm")
    return { success: true, message: `Berhasil mengimpor ${flatRecords.length} data stok!` }
  } catch (error) {
    console.error("BPM/TFM CSV Import Error:", error)
    return { success: false, message: String(error) }
  }
}

export async function deleteBpmTfmStockAction(id: string) {
  try {
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

