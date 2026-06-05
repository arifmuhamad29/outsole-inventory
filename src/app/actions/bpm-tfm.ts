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
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const codeLast = row["Code Last"]?.trim()
        const toolName = row["Tool Name"]?.trim().toUpperCase()
        const rawType = row["Type"]?.trim().toUpperCase() || ""
        const size = row["Size"]?.trim().toUpperCase()
        const devStock = parseInt(row["Dev Stock"] || "0", 10)

        if (!codeLast || !toolName || !size) continue

        await tx.bpmTfmStock.upsert({
          where: {
            codeLast_toolName_type_size: {
              codeLast,
              toolName,
              type: rawType,
              size,
            },
          },
          update: {
            devStock,
          },
          create: {
            codeLast,
            toolName,
            type: rawType,
            size,
            devStock,
          },
        })
      }
    }, {
      timeout: 60000,
    })

    revalidatePath("/bpm-tfm")
    return { success: true, message: "Bulk import berhasil!" }
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
