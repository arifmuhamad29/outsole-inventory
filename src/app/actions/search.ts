"use server";

import prisma from "@/lib/prisma";

export async function globalSearchPO(query: string) {
  if (!query || query.trim() === "") return [];
  
  return await prisma.purchaseTracking.findMany({
    where: {
      OR: [
        { article: { contains: query, mode: "insensitive" } },
        { modelName: { contains: query, mode: "insensitive" } },
        { poNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    distinct: ["batchId"], // Group multiple sizes into a single PO result
    take: 10, // Limit results for performance
    include: { season: true } // Include relations if needed
  });
}
