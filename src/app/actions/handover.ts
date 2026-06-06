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

export async function getAvailableShoeModelsAction(): Promise<string[]> {
  try {
    const models = await prisma.shoeModel.findMany({
      select: { name: true },
      orderBy: { name: "asc" }
    })
    
    const bpmStocks = await prisma.bpmTfmStock.findMany({
      select: { codeLast: true },
      distinct: ["codeLast"],
    })
    
    const modelNames = models.map(m => m.name)
    const stockCodeLasts = bpmStocks.map(b => b.codeLast)
    
    // Combine and get unique sorted list
    const combined = Array.from(new Set([...modelNames, ...stockCodeLasts]))
    combined.sort((a, b) => a.localeCompare(b))
    
    return combined
  } catch (error) {
    console.error("Error fetching shoe models:", error)
    return []
  }
}
