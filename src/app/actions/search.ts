"use server";

import prisma from "@/lib/prisma";

export async function globalSearchAll(query: string) {
  if (!query || query.trim() === "") return [];
  
  // 1. Run queries concurrently across multiple tables
  const [trackingData, inventoryData, handoverData] = await Promise.all([
    prisma.purchaseTracking.findMany({
      where: {
        OR: [
          { article: { contains: query, mode: "insensitive" } },
          { modelName: { contains: query, mode: "insensitive" } },
          { poNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      distinct: ["batchId"],
      take: 5,
      include: { season: true }
    }),
    prisma.outsole.findMany({
      where: {
        OR: [
          { article: { contains: query, mode: "insensitive" } },
          { model: { contains: query, mode: "insensitive" } },
          { poNumber: { contains: query, mode: "insensitive" } },
          { qrCode: { contains: query, mode: "insensitive" } },
        ],
      },
      distinct: ["article", "model", "poNumber"],
      take: 5,
    }),
    prisma.handover.findMany({
      where: {
        OR: [
          { recipient: { contains: query, mode: "insensitive" } },
          { modelName: { contains: query, mode: "insensitive" } },
          { codeLast: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    })
  ]);

  // 2. Normalize and format the results into a single universal array
  type UnifiedSearchResult = {
    id: string;
    originalId: string;
    title: string;
    subtitle: string;
    module: string;
    badgeColor: string;
    url: string;
  };
  
  const results: UnifiedSearchResult[] = [];

  trackingData.forEach((item) => {
    results.push({
      id: `tracking-${item.id}`,
      originalId: item.batchId,
      title: `${item.article} - ${item.modelName}`,
      subtitle: `PO: ${item.poNumber || "N/A"} | Season: ${item.season?.name || "-"}`,
      module: "Tracking",
      badgeColor: "bg-blue-100 text-blue-800",
      url: `/tracking?highlight=${item.batchId}`,
    });
  });

  inventoryData.forEach((item) => {
    results.push({
      id: `inv-${item.id}`,
      originalId: item.id,
      title: `${item.article !== "-" ? item.article : "No Article"} - ${item.model}`,
      subtitle: `Inventory | Stock: ${item.stock} | PO: ${item.poNumber || "N/A"}`,
      module: "Inventory",
      badgeColor: "bg-purple-100 text-purple-800",
      url: `/inventory?search=${item.article !== "-" ? item.article : item.model}`,
    });
  });

  handoverData.forEach((item) => {
    results.push({
      id: `handover-${item.id}`,
      originalId: item.id,
      title: `${item.modelName || "N/A"} - ${item.codeLast || "N/A"}`,
      subtitle: `Recipient: ${item.recipient} | Date: ${item.date.toLocaleDateString()}`,
      module: "Handover",
      badgeColor: "bg-orange-100 text-orange-800",
      url: `/handover?highlight=${item.id}`,
    });
  });

  return results;
}
