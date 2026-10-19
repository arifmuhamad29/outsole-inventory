"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createNotification } from "./notification"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { clearTrackingCache } from "./conform"
import {
  bulkTrackingSchema,
  normalizeGender,
  normalizeOrderStatus,
  normalizeBottomTreatment,
} from "@/schemas/tracking"

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
      wedgeMaterial: true,
      wedgeColor: true,
      crDeviceMaterial: true,
      crDeviceColor: true,
      bottomTreatment: true,
      imageUrl: true, // We still need thumbnail — but only once per batch
      size: true,
      quantity: true,
      isOrdered: true,
      orderStatus: true,
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
      wedgeMaterial: true,
      wedgeColor: true,
      crDeviceMaterial: true,
      crDeviceColor: true,
      bottomTreatment: true,
      imageUrl: true,
      size: true,
      quantity: true,
      isOrdered: true,
      orderStatus: true,
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
  wedgeMaterial?: string
  wedgeColor?: string
  crDeviceMaterial?: string
  crDeviceColor?: string
  bottomTreatment?: string
  imageUrl?: string
  sizes: Record<string, number>
  isOrdered: boolean
  orderStatus: string
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
      wedgeMaterial: data.wedgeMaterial?.trim() || null,
      wedgeColor: data.wedgeColor?.trim() || null,
      crDeviceMaterial: data.crDeviceMaterial?.trim() || null,
      crDeviceColor: data.crDeviceColor?.trim() || null,
      bottomTreatment: data.bottomTreatment || null,
      imageUrl: data.imageUrl || null,
      size: size.trim(),
      quantity: quantity,
      isOrdered: data.isOrdered,
      orderStatus: data.orderStatus,
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

    await clearTrackingCache()
    revalidatePath("/tracking")
    revalidatePath("/conform-history")

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
    wedgeMaterial?: string
    wedgeColor?: string
    crDeviceMaterial?: string
    crDeviceColor?: string
    bottomTreatment?: string
    imageUrl?: string
    sizes: Record<string, number>
    isOrdered: boolean
    orderStatus: string
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
      wedgeMaterial: data.wedgeMaterial?.trim() || null,
      wedgeColor: data.wedgeColor?.trim() || null,
      crDeviceMaterial: data.crDeviceMaterial?.trim() || null,
      crDeviceColor: data.crDeviceColor?.trim() || null,
      bottomTreatment: data.bottomTreatment || null,
      imageUrl: data.imageUrl || null,
      size: size.trim(),
      quantity: quantity,
      isOrdered: data.isOrdered,
      orderStatus: data.orderStatus,
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

    await clearTrackingCache()
    revalidatePath("/tracking")
    revalidatePath("/conform-history")
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

    await clearTrackingCache()
    revalidatePath("/tracking")
    revalidatePath("/conform-history")
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

// ============================
// BULK IMPORT: Purchase Tracking via CSV
// ============================
export async function processBulkTrackingAction(
  rows: unknown[],
  fallbackSeasonId?: string | null
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }
    const role = session.user.role
    const permissions = session.user.permissions || []
    const canManage = role === "SUPER_ADMIN" || permissions.includes("MANAGE_TRACKING")
    if (!canManage) {
      return { success: false, message: "Forbidden: Anda tidak memiliki izin Kelola Tracking" }
    }

    // STRICT server-side Zod re-validation
    const validation = bulkTrackingSchema.safeParse(rows)
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => {
        const rowIndex = typeof issue.path[0] === "number" ? issue.path[0] : null
        const field = issue.path[1] || "unknown"
        const rowLabel = rowIndex !== null ? `Row ${rowIndex + 2}` : "Unknown row"
        return `${rowLabel}: '${String(field)}' — ${issue.message}`
      })
      return {
        success: false,
        message: `Upload ditolak: ${validation.error.issues.length} kesalahan validasi ditemukan.`,
        details: {
          successCount: 0,
          errorCount: validation.error.issues.length,
          errors: errors.slice(0, 25),
        },
      }
    }

    const validatedRows = validation.data
    if (validatedRows.length > 500) {
      return { success: false, message: "Maksimal 500 baris per sekali import." }
    }

    // Additional semantic validation (Gender)
    const semanticErrors: string[] = []
    for (let i = 0; i < validatedRows.length; i++) {
      const row = validatedRows[i]
      const gender = normalizeGender(row.Gender)
      if (!gender) {
        semanticErrors.push(`Row ${i + 2}: Gender '${row.Gender}' tidak valid. Pilihan: Men, Women, Unisex, Infant, Kids/Jr`)
      }
    }
    if (semanticErrors.length > 0) {
      return {
        success: false,
        message: `Upload ditolak: Terdapat ${semanticErrors.length} kesalahan gender.`,
        details: {
          successCount: 0,
          errorCount: semanticErrors.length,
          errors: semanticErrors.slice(0, 25),
        },
      }
    }

    // Fetch existing seasons
    const existingSeasons = await prisma.season.findMany()
    const seasonMap = new Map<string, string>() // lowercase name -> seasonId
    existingSeasons.forEach((s) => seasonMap.set(s.name.trim().toLowerCase(), s.id))

    // Fallback season
    let defaultSeason = existingSeasons.find((s) => s.id === fallbackSeasonId)
    if (!defaultSeason) {
      defaultSeason = existingSeasons.find((s) => s.name.toUpperCase() === "SS27") || existingSeasons[0]
    }
    if (!defaultSeason) {
      defaultSeason = await prisma.season.create({ data: { name: "SS27" } })
      seasonMap.set("ss27", defaultSeason.id)
    }

    // Helper to resolve or auto-create season
    async function resolveSeasonId(seasonName?: string): Promise<string> {
      if (!seasonName || !seasonName.trim()) {
        return defaultSeason!.id
      }
      const trimmed = seasonName.trim()
      const lower = trimmed.toLowerCase()
      if (seasonMap.has(lower)) {
        return seasonMap.get(lower)!
      }
      const created = await prisma.season.create({
        data: { name: trimmed }
      })
      seasonMap.set(lower, created.id)
      return created.id
    }

    // Pre-resolve all seasons
    for (const row of validatedRows) {
      if (row.Season?.trim()) {
        await resolveSeasonId(row.Season.trim())
      }
    }

    // Group rows into batches
    interface GroupBatch {
      batchId: string
      seasonId: string
      article: string
      modelName: string
      genderCategory: string
      poNumber: string | null
      supplier: string | null
      midsoleMaterial: string | null
      midsoleColor: string | null
      outsoleMaterial: string | null
      outsoleColor: string | null
      wedgeMaterial: string | null
      wedgeColor: string | null
      crDeviceMaterial: string | null
      crDeviceColor: string | null
      bottomTreatment: string | null
      orderStatus: string
      isOrdered: boolean
      notes: string | null
      sizes: Map<string, number>
    }

    const groups = new Map<string, GroupBatch>()

    for (const row of validatedRows) {
      const seasonId = await resolveSeasonId(row.Season?.trim())
      const article = row.Article.trim().toUpperCase()
      const modelName = row.Model.trim().toUpperCase()
      const gender = normalizeGender(row.Gender)!
      const poNumber = row.PONumber && row.PONumber !== "-" ? row.PONumber.trim() : null
      const groupKey = `${seasonId}:::${article}:::${modelName}:::${gender}:::${poNumber || "-"}`

      const statusInfo = normalizeOrderStatus(row.OrderStatus)
      const bottomTreatment = normalizeBottomTreatment(row.BottomTreatment)

      let group = groups.get(groupKey)
      if (!group) {
        group = {
          batchId: randomUUID(),
          seasonId,
          article,
          modelName,
          genderCategory: gender,
          poNumber,
          supplier: row.Supplier?.trim() || null,
          midsoleMaterial: row.MidsoleMaterial?.trim() || null,
          midsoleColor: row.MidsoleColor?.trim() || null,
          outsoleMaterial: row.OutsoleMaterial?.trim() || null,
          outsoleColor: row.OutsoleColor?.trim() || null,
          wedgeMaterial: row.WedgeMaterial?.trim() || null,
          wedgeColor: row.WedgeColor?.trim() || null,
          crDeviceMaterial: row.CRMaterial?.trim() || null,
          crDeviceColor: row.CRColor?.trim() || null,
          bottomTreatment,
          orderStatus: statusInfo.orderStatus,
          isOrdered: statusInfo.isOrdered,
          notes: row.Notes?.trim() || null,
          sizes: new Map<string, number>(),
        }
        groups.set(groupKey, group)
      } else {
        // Update empty attributes with any provided data
        if (!group.supplier && row.Supplier?.trim()) group.supplier = row.Supplier.trim()
        if (!group.midsoleColor && row.MidsoleColor?.trim()) group.midsoleColor = row.MidsoleColor.trim()
        if (!group.midsoleMaterial && row.MidsoleMaterial?.trim()) group.midsoleMaterial = row.MidsoleMaterial.trim()
        if (!group.outsoleColor && row.OutsoleColor?.trim()) group.outsoleColor = row.OutsoleColor.trim()
        if (!group.outsoleMaterial && row.OutsoleMaterial?.trim()) group.outsoleMaterial = row.OutsoleMaterial.trim()
        if (!group.wedgeColor && row.WedgeColor?.trim()) group.wedgeColor = row.WedgeColor.trim()
        if (!group.wedgeMaterial && row.WedgeMaterial?.trim()) group.wedgeMaterial = row.WedgeMaterial.trim()
        if (!group.crDeviceColor && row.CRColor?.trim()) group.crDeviceColor = row.CRColor.trim()
        if (!group.crDeviceMaterial && row.CRMaterial?.trim()) group.crDeviceMaterial = row.CRMaterial.trim()
        if (!group.bottomTreatment && bottomTreatment) group.bottomTreatment = bottomTreatment
        if (group.orderStatus === "NOT_ORDERED" && statusInfo.orderStatus !== "NOT_ORDERED") {
          group.orderStatus = statusInfo.orderStatus
          group.isOrdered = statusInfo.isOrdered
        }
        if (!group.notes && row.Notes?.trim()) group.notes = row.Notes.trim()
      }

      // Add/aggregate size quantity
      const cleanSize = row.Size.trim()
      const currentQty = group.sizes.get(cleanSize) || 0
      group.sizes.set(cleanSize, currentQty + Number(row.Quantity))
    }

    // Build database records
    const recordsToCreate: {
      batchId: string
      seasonId: string
      article: string
      modelName: string
      genderCategory: string
      poNumber: string | null
      supplier: string | null
      midsoleMaterial: string | null
      midsoleColor: string | null
      outsoleMaterial: string | null
      outsoleColor: string | null
      wedgeMaterial: string | null
      wedgeColor: string | null
      crDeviceMaterial: string | null
      crDeviceColor: string | null
      bottomTreatment: string | null
      orderStatus: string
      isOrdered: boolean
      notes: string | null
      size: string
      quantity: number
    }[] = []

    for (const group of groups.values()) {
      for (const [size, quantity] of group.sizes.entries()) {
        recordsToCreate.push({
          batchId: group.batchId,
          seasonId: group.seasonId,
          article: group.article,
          modelName: group.modelName,
          genderCategory: group.genderCategory,
          poNumber: group.poNumber,
          supplier: group.supplier,
          midsoleMaterial: group.midsoleMaterial,
          midsoleColor: group.midsoleColor,
          outsoleMaterial: group.outsoleMaterial,
          outsoleColor: group.outsoleColor,
          wedgeMaterial: group.wedgeMaterial,
          wedgeColor: group.wedgeColor,
          crDeviceMaterial: group.crDeviceMaterial,
          crDeviceColor: group.crDeviceColor,
          bottomTreatment: group.bottomTreatment,
          orderStatus: group.orderStatus,
          isOrdered: group.isOrdered,
          notes: group.notes,
          size,
          quantity,
        })
      }
    }

    // Atomic insert
    await prisma.purchaseTracking.createMany({
      data: recordsToCreate,
    })

    // Invalidate caches & paths
    await clearTrackingCache()
    revalidatePath("/tracking")
    revalidatePath("/conform-history")

    await createNotification(
      "Bulk Tracking Berhasil",
      `Berhasil mengimpor ${groups.size} PO Matrix (${recordsToCreate.length} baris ukuran).`,
      "info"
    )

    return {
      success: true,
      message: `Berhasil mengimpor ${groups.size} PO Matrix (${recordsToCreate.length} ukuran total).`,
      details: {
        successCount: recordsToCreate.length,
        errorCount: 0,
        errors: [],
        batchesCount: groups.size,
      },
    }
  } catch (error) {
    console.error("Process Bulk Tracking Error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengimpor data tracking.",
    }
  }
}

