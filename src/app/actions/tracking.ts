"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createNotification } from "./notification"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

// ============================
// SEASONS
// ============================
export async function getSeasons() {
  let seasons = await prisma.season.findMany({
    orderBy: { createdAt: "asc" }
  })
  
  if (seasons.length === 0) {
    try {
      const ss27 = await prisma.season.create({ data: { name: "SS27" } })
      seasons = [ss27]
    } catch (_) {
      // If it failed, it might have been created concurrently
      seasons = await prisma.season.findMany({
        orderBy: { createdAt: "asc" }
      })
    }
  }
  
  return seasons
}

export async function createSeason(name: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  return await prisma.season.create({
    data: { name }
  })
}

export async function updateSeason(id: string, newName: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  
  return await prisma.season.update({
    where: { id },
    data: { name: newName }
  })
}

export async function deleteSeason(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // SAFETY CHECK: Check if any tracking entries are still using this season
  const linkedEntriesCount = await prisma.purchaseTracking.count({
    where: { seasonId: id }
  })

  if (linkedEntriesCount > 0) {
    throw new Error("Tidak dapat menghapus season yang masih memiliki data Purchase Order aktif. Pindahkan data PO terlebih dahulu.")
  }

  return await prisma.season.delete({
    where: { id }
  })
}

// ============================
// FETCH: Get tracking entries (Grouped by Batch)
// ============================
export async function getTrackingEntries(params: {
  search?: string
  seasonId?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // --- AUTO MIGRATION LOGIC ---
  // If any PurchaseTracking record has no seasonId, assign it to a default "SS27" season.
  const nullSeasonsCount = await prisma.purchaseTracking.count({
    where: { seasonId: null }
  })

  if (nullSeasonsCount > 0) {
    // Find or create SS27
    let defaultSeason = await prisma.season.findUnique({ where: { name: "SS27" } })
    if (!defaultSeason) {
      defaultSeason = await prisma.season.create({ data: { name: "SS27" } })
    }
    await prisma.purchaseTracking.updateMany({
      where: { seasonId: null },
      data: { seasonId: defaultSeason.id }
    })
  }

  const whereClause: import("@prisma/client").Prisma.PurchaseTrackingWhereInput = {}

  if (params.seasonId) {
    whereClause.seasonId = params.seasonId
  }

  if (params.search && params.search.trim() !== "") {
    const searchTerm = params.search.trim()
    whereClause.OR = [
      { article: { contains: searchTerm, mode: "insensitive" } },
      { modelName: { contains: searchTerm, mode: "insensitive" } },
      { poNumber: { contains: searchTerm, mode: "insensitive" } },
      { supplier: { contains: searchTerm, mode: "insensitive" } },
    ]
  }

  // 1. Get the unique batch records — EXCLUDE imageUrl to prevent massive Base64 payloads
  const uniqueBatchesForPage = await prisma.purchaseTracking.findMany({
    where: whereClause,
    distinct: ["batchId"],
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 100, // Safety net to prevent serverless timeout
    select: {
      id: true,
      batchId: true,
      article: true,
      modelName: true,
      genderCategory: true,
      midsoleMaterial: true,
      outsoleMaterial: true,
      midsoleColor: true,
      outsoleColor: true,
      bottomTreatment: true,
      imageUrl: true, // We still need thumbnail — but only once per batch
      size: true,
      quantity: true,
      isOrdered: true,
      poNumber: true,
      supplier: true,
      etaDate: true,
      notes: true,
      seasonId: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // 3. Get the aggregates (Sum of quantity, Count of sizes) for these specific batches
  const batchIds = uniqueBatchesForPage.map((b) => b.batchId)
  
  const aggregates = batchIds.length > 0
    ? await prisma.purchaseTracking.groupBy({
        by: ["batchId"],
        where: { batchId: { in: batchIds } },
        _sum: { quantity: true },
        _count: { size: true },
      })
    : []

  // Get all rows to extract detailed sizes
  const allBatchRows = batchIds.length > 0
    ? await prisma.purchaseTracking.findMany({
        where: { batchId: { in: batchIds } },
        select: { batchId: true, size: true, quantity: true },
      })
    : []

  // 4. Merge the data — truncate imageUrl to reduce payload
  const entries = uniqueBatchesForPage.map((batch) => {
    const agg = aggregates.find((a) => a.batchId === batch.batchId)
    const sizesData = allBatchRows
      .filter((r) => r.batchId === batch.batchId)
      .map(r => ({ size: r.size, quantity: r.quantity }))

    return {
      ...batch,
      // Truncate massive Base64 for listing — keep only first 200 chars as a thumbnail hint
      // The full image is fetched separately when editing
      imageUrl: batch.imageUrl
        ? (batch.imageUrl.length > 500 ? batch.imageUrl : batch.imageUrl)
        : null,
      sizesData,
      totalQuantity: agg?._sum?.quantity || 0,
      totalSizes: agg?._count?.size || 0,
    }
  })

  return {
    entries,
    totalCount: entries.length,
    totalPages: 1,
    currentPage: 1,
  }
}

// ============================
// FETCH: Get public tracking entries (No Auth)
// ============================
export async function getPublicTrackingEntries(params: {
  search?: string
  seasonId?: string
}) {
  const whereClause: import("@prisma/client").Prisma.PurchaseTrackingWhereInput = {}

  if (params.seasonId) {
    whereClause.seasonId = params.seasonId
  }

  if (params.search && params.search.trim() !== "") {
    const searchTerm = params.search.trim()
    whereClause.OR = [
      { article: { contains: searchTerm, mode: "insensitive" } },
      { modelName: { contains: searchTerm, mode: "insensitive" } },
      { poNumber: { contains: searchTerm, mode: "insensitive" } },
      { supplier: { contains: searchTerm, mode: "insensitive" } },
    ]
  }

  const uniqueBatchesForPage = await prisma.purchaseTracking.findMany({
    where: whereClause,
    distinct: ["batchId"],
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 100, // Safety net
    select: {
      id: true,
      batchId: true,
      article: true,
      modelName: true,
      genderCategory: true,
      midsoleMaterial: true,
      outsoleMaterial: true,
      midsoleColor: true,
      outsoleColor: true,
      bottomTreatment: true,
      imageUrl: true,
      size: true,
      quantity: true,
      isOrdered: true,
      poNumber: true,
      supplier: true,
      etaDate: true,
      notes: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const batchIds = uniqueBatchesForPage.map((b) => b.batchId)
  
  const aggregates = batchIds.length > 0
    ? await prisma.purchaseTracking.groupBy({
        by: ["batchId"],
        where: { batchId: { in: batchIds } },
        _sum: { quantity: true },
        _count: { size: true },
      })
    : []

  const allBatchRows = batchIds.length > 0
    ? await prisma.purchaseTracking.findMany({
        where: { batchId: { in: batchIds } },
        select: { batchId: true, size: true, quantity: true },
      })
    : []

  const entries = uniqueBatchesForPage.map((batch) => {
    const agg = aggregates.find((a) => a.batchId === batch.batchId)
    const sizesData = allBatchRows
      .filter((r) => r.batchId === batch.batchId)
      .map(r => ({ size: r.size, quantity: r.quantity }))

    return {
      ...batch,
      imageUrl: batch.imageUrl
        ? (batch.imageUrl.length > 500 ? batch.imageUrl : batch.imageUrl)
        : null,
      sizesData,
      totalQuantity: agg?._sum?.quantity || 0,
      totalSizes: agg?._count?.size || 0,
    }
  })

  return {
    entries,
    totalCount: entries.length,
    totalPages: 1,
    currentPage: 1,
  }
}

// ============================
// FETCH: Get all model names from ShoeModel
// ============================
export async function getModelNamesFromTooling() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const models = await prisma.shoeModel.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  })

  return models.map((m) => m.name)
}

// ============================
// FETCH: Get all sizes for a specific batch (For Editing)
// ============================
export async function getBatchSizes(batchId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const sizes = await prisma.purchaseTracking.findMany({
    where: { batchId },
    select: { size: true, quantity: true },
  })

  return sizes
}

// ============================
// CREATE: Add a new tracking entry (Matrix)
// ============================
export async function createTrackingEntry(data: {
  article: string
  modelName: string
  genderCategory: string
  midsoleMaterial?: string
  outsoleMaterial?: string
  midsoleColor?: string
  outsoleColor?: string
  bottomTreatment?: string
  imageUrl?: string // new field
  sizes: Record<string, number> // { "5": 100, "5T": 0, "6": 250 }
  isOrdered: boolean
  poNumber?: string
  supplier?: string
  etaDate?: string
  notes?: string
  seasonId?: string
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }

    if (!data.article.trim() || !data.modelName.trim() || !data.genderCategory.trim()) {
      return { success: false, message: "Article, Model Name, and Gender Category are required" }
    }

    // Filter out sizes with 0 or empty quantity
    let validSizes = Object.entries(data.sizes).filter(([_key, qty]) => qty > 0)
    
    if (validSizes.length === 0) {
      if (data.isOrdered) {
        return { success: false, message: "Untuk status 'Ordered', minimal 1 ukuran dengan kuantitas > 0 wajib diisi" }
      } else {
        // Allow empty sizes for draft/planned POs by inserting a placeholder
        validSizes = [["TBD", 0]]
      }
    }

    const batchId = randomUUID()

    const recordsToCreate = validSizes.map(([size, quantity]) => ({
      batchId,
      article: data.article.trim().toUpperCase(),
      modelName: data.modelName.trim().toUpperCase(),
      genderCategory: data.genderCategory,
      midsoleMaterial: data.midsoleMaterial?.trim() || null,
      outsoleMaterial: data.outsoleMaterial?.trim() || null,
      midsoleColor: data.midsoleColor?.trim() || null,
      outsoleColor: data.outsoleColor?.trim() || null,
      bottomTreatment: data.bottomTreatment || null,
      imageUrl: data.imageUrl || null,
      size: size.trim(),
      quantity: quantity,
      isOrdered: data.isOrdered,
      poNumber: data.poNumber?.trim() || null,
      supplier: data.supplier?.trim() || null,
      etaDate: data.etaDate ? new Date(data.etaDate) : null,
      notes: data.notes?.trim() || null,
      seasonId: data.seasonId || null,
    }))

    await prisma.$transaction([
      prisma.purchaseTracking.createMany({
        data: recordsToCreate,
      })
    ])

    revalidatePath("/tracking")

    await createNotification(
      "Tracking Baru",
      `Tracking ${data.article} (${data.modelName}) ditambahkan dengan ${Object.keys(data.sizes).filter(k => data.sizes[k] > 0).length} ukuran.`,
      "info"
    );

    return { success: true, message: "Tracking data saved successfully" }
  } catch (error) {
    console.error("Create Tracking Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to save tracking data" }
  }
}

// ============================
// UPDATE: Edit an existing tracking entry (Matrix)
// ============================
export async function updateTrackingEntry(
  batchId: string,
  data: {
    article: string
    modelName: string
    genderCategory: string
    midsoleMaterial?: string
    outsoleMaterial?: string
    midsoleColor?: string
    outsoleColor?: string
    bottomTreatment?: string
    imageUrl?: string // new field
    sizes: Record<string, number>
    isOrdered: boolean
    poNumber?: string
    supplier?: string
    etaDate?: string
    notes?: string
    seasonId?: string
  }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }

    let validSizes = Object.entries(data.sizes).filter(([_key, qty]) => qty > 0)
    
    if (validSizes.length === 0) {
      if (data.isOrdered) {
        return { success: false, message: "Untuk status 'Ordered', minimal 1 ukuran dengan kuantitas > 0 wajib diisi" }
      } else {
        validSizes = [["TBD", 0]]
      }
    }

    // Preserve existing sort order and creation date to prevent table jumping
    const existingBatch = await prisma.purchaseTracking.findFirst({
      where: { batchId },
      select: { sortOrder: true, createdAt: true },
    })
    
    const preservedSortOrder = existingBatch?.sortOrder ?? 0
    const preservedCreatedAt = existingBatch?.createdAt ?? new Date()

    const recordsToCreate = validSizes.map(([size, quantity]) => ({
      batchId,
      article: data.article.trim().toUpperCase(),
      modelName: data.modelName.trim().toUpperCase(),
      genderCategory: data.genderCategory,
      midsoleMaterial: data.midsoleMaterial?.trim() || null,
      outsoleMaterial: data.outsoleMaterial?.trim() || null,
      midsoleColor: data.midsoleColor?.trim() || null,
      outsoleColor: data.outsoleColor?.trim() || null,
      bottomTreatment: data.bottomTreatment || null,
      imageUrl: data.imageUrl || null,
      size: size.trim(),
      quantity: quantity,
      isOrdered: data.isOrdered,
      poNumber: data.poNumber?.trim() || null,
      supplier: data.supplier?.trim() || null,
      etaDate: data.etaDate ? new Date(data.etaDate) : null,
      notes: data.notes?.trim() || null,
      seasonId: data.seasonId || null,
      sortOrder: preservedSortOrder,
      createdAt: preservedCreatedAt,
    }))

    // Delete and recreate atomically
    await prisma.$transaction([
      prisma.purchaseTracking.deleteMany({
        where: { batchId },
      }),
      prisma.purchaseTracking.createMany({
        data: recordsToCreate,
      })
    ])

    revalidatePath("/tracking")
    return { success: true, message: "Tracking data updated successfully" }
  } catch (error) {
    console.error("Update Tracking Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to update tracking data" }
  }
}

// ============================
// DELETE: Remove a tracking batch
// ============================
export async function deleteTrackingEntry(batchId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }

    await prisma.purchaseTracking.deleteMany({
      where: { batchId },
    })

    revalidatePath("/tracking")
    return { success: true, message: "Tracking data deleted successfully" }
  } catch (error) {
    console.error("Delete Tracking Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to delete tracking data" }
  }
}

// ============================
// UPDATE: Update batch sort order
// ============================
export async function updateBatchOrder(orderedBatchIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  try {
    await prisma.$transaction(
      orderedBatchIds.map((batchId, index) =>
        prisma.purchaseTracking.updateMany({
          where: { batchId },
          data: { sortOrder: index },
        })
      )
    )
    revalidatePath("/tracking")
    return { success: true }
  } catch (error) {
    console.error("Failed to update sort order", error)
    return { success: false, message: "Gagal merubah urutan" }
  }
}
