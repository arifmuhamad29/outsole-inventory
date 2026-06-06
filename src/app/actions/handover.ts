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
