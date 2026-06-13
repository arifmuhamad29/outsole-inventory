"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

// ============================
// FETCH: Get tracking entries (Grouped by Batch)
// ============================
export async function getTrackingEntries(params: {
  search?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const whereClause: import("@prisma/client").Prisma.PurchaseTrackingWhereInput = {}

  if (params.search && params.search.trim() !== "") {
    const searchTerm = params.search.trim()
    whereClause.OR = [
      { article: { contains: searchTerm, mode: "insensitive" } },
      { modelName: { contains: searchTerm, mode: "insensitive" } },
      { poNumber: { contains: searchTerm, mode: "insensitive" } },
      { supplier: { contains: searchTerm, mode: "insensitive" } },
    ]
  }

  // 1. Get the unique batch records
  const uniqueBatchesForPage = await prisma.purchaseTracking.findMany({
    where: whereClause,
    distinct: ["batchId"],
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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

  // 4. Merge the data
  const entries = uniqueBatchesForPage.map((batch) => {
    const agg = aggregates.find((a) => a.batchId === batch.batchId)
    return {
      ...batch,
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
}) {
  const whereClause: import("@prisma/client").Prisma.PurchaseTrackingWhereInput = {}

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

  const entries = uniqueBatchesForPage.map((batch) => {
    const agg = aggregates.find((a) => a.batchId === batch.batchId)
    return {
      ...batch,
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
    const validSizes = Object.entries(data.sizes).filter(([_, qty]) => qty > 0)
    
    if (validSizes.length === 0) {
      return { success: false, message: "At least one size with quantity > 0 is required" }
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
    }))

    await prisma.$transaction([
      prisma.purchaseTracking.createMany({
        data: recordsToCreate,
      })
    ])

    revalidatePath("/tracking")
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
  }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }

    const validSizes = Object.entries(data.sizes).filter(([_, qty]) => qty > 0)
    
    if (validSizes.length === 0) {
      return { success: false, message: "At least one size with quantity > 0 is required" }
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
