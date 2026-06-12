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
  page?: number
  limit?: number
}) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const page = params.page || 1
  const limit = params.limit || 25
  const skip = (page - 1) * limit

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

  // 1. Get total unique batches for pagination
  // Unfortunately, Prisma doesn't support count with distinct easily, so we query the distinct batchIds
  const distinctBatches = await prisma.purchaseTracking.findMany({
    where: whereClause,
    distinct: ["batchId"],
    select: { batchId: true },
  })
  const totalCount = distinctBatches.length

  // 2. Get the unique batch records for the current page
  const uniqueBatchesForPage = await prisma.purchaseTracking.findMany({
    where: whereClause,
    distinct: ["batchId"],
    orderBy: { updatedAt: "desc" },
    skip,
    take: limit,
  })

  // 3. Get the aggregates (Sum of quantity, Count of sizes) for these specific batches
  const batchIds = uniqueBatchesForPage.map((b) => b.batchId)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let aggregates: any[] = []
  if (batchIds.length > 0) {
    aggregates = await prisma.purchaseTracking.groupBy({
      by: ["batchId"],
      where: { batchId: { in: batchIds } },
      _sum: { quantity: true },
      _count: { size: true },
    })
  }

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
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
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
      return { success: false, message: "Article, Model Name, dan Gender Category wajib diisi" }
    }

    // Filter out sizes with 0 or empty quantity
    const validSizes = Object.entries(data.sizes).filter(([_, qty]) => qty > 0)
    
    if (validSizes.length === 0) {
      return { success: false, message: "Minimal harus ada satu ukuran dengan quantity > 0" }
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
    return { success: true, message: "Data tracking berhasil ditambahkan!" }
  } catch (error) {
    console.error("Create Tracking Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Gagal menambahkan data" }
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
      return { success: false, message: "Minimal harus ada satu ukuran dengan quantity > 0" }
    }

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
      size: size.trim(),
      quantity: quantity,
      isOrdered: data.isOrdered,
      poNumber: data.poNumber?.trim() || null,
      supplier: data.supplier?.trim() || null,
      etaDate: data.etaDate ? new Date(data.etaDate) : null,
      notes: data.notes?.trim() || null,
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
    return { success: true, message: "Data tracking berhasil diperbarui!" }
  } catch (error) {
    console.error("Update Tracking Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Gagal memperbarui data" }
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
    return { success: true, message: "Data tracking berhasil dihapus!" }
  } catch (error) {
    console.error("Delete Tracking Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Gagal menghapus data" }
  }
}
