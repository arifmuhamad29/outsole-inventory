"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ============================
// FETCH: Get all tracking entries with search + pagination
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
      { size: { contains: searchTerm, mode: "insensitive" } },
    ]
  }

  const [entries, totalCount] = await prisma.$transaction([
    prisma.purchaseTracking.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseTracking.count({ where: whereClause }),
  ])

  return {
    entries,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  }
}

// ============================
// FETCH: Get all model names from ShoeModel (Tooling MES)
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
// CREATE: Add a new tracking entry
// ============================
export async function createTrackingEntry(data: {
  article: string
  modelName: string
  midsoleMaterial?: string
  outsoleMaterial?: string
  midsoleColor?: string
  outsoleColor?: string
  bottomTreatment?: string
  size: string
  quantity: number
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

    if (!data.article.trim() || !data.modelName.trim() || !data.size.trim()) {
      return { success: false, message: "Article, Model Name, dan Size wajib diisi" }
    }

    await prisma.purchaseTracking.create({
      data: {
        article: data.article.trim().toUpperCase(),
        modelName: data.modelName.trim().toUpperCase(),
        midsoleMaterial: data.midsoleMaterial?.trim() || null,
        outsoleMaterial: data.outsoleMaterial?.trim() || null,
        midsoleColor: data.midsoleColor?.trim() || null,
        outsoleColor: data.outsoleColor?.trim() || null,
        bottomTreatment: data.bottomTreatment || null,
        size: data.size.trim(),
        quantity: data.quantity || 0,
        isOrdered: data.isOrdered,
        poNumber: data.poNumber?.trim() || null,
        supplier: data.supplier?.trim() || null,
        etaDate: data.etaDate ? new Date(data.etaDate) : null,
        notes: data.notes?.trim() || null,
      },
    })

    revalidatePath("/tracking")
    return { success: true, message: "Data tracking berhasil ditambahkan!" }
  } catch (error) {
    console.error("Create Tracking Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Gagal menambahkan data" }
  }
}

// ============================
// UPDATE: Edit an existing tracking entry
// ============================
export async function updateTrackingEntry(
  id: string,
  data: {
    article: string
    modelName: string
    midsoleMaterial?: string
    outsoleMaterial?: string
    midsoleColor?: string
    outsoleColor?: string
    bottomTreatment?: string
    size: string
    quantity: number
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

    await prisma.purchaseTracking.update({
      where: { id },
      data: {
        article: data.article.trim().toUpperCase(),
        modelName: data.modelName.trim().toUpperCase(),
        midsoleMaterial: data.midsoleMaterial?.trim() || null,
        outsoleMaterial: data.outsoleMaterial?.trim() || null,
        midsoleColor: data.midsoleColor?.trim() || null,
        outsoleColor: data.outsoleColor?.trim() || null,
        bottomTreatment: data.bottomTreatment || null,
        size: data.size.trim(),
        quantity: data.quantity || 0,
        isOrdered: data.isOrdered,
        poNumber: data.poNumber?.trim() || null,
        supplier: data.supplier?.trim() || null,
        etaDate: data.etaDate ? new Date(data.etaDate) : null,
        notes: data.notes?.trim() || null,
      },
    })

    revalidatePath("/tracking")
    return { success: true, message: "Data tracking berhasil diperbarui!" }
  } catch (error) {
    console.error("Update Tracking Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Gagal memperbarui data" }
  }
}

// ============================
// DELETE: Remove a tracking entry
// ============================
export async function deleteTrackingEntry(id: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" }
    }

    await prisma.purchaseTracking.delete({
      where: { id },
    })

    revalidatePath("/tracking")
    return { success: true, message: "Data tracking berhasil dihapus!" }
  } catch (error) {
    console.error("Delete Tracking Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Gagal menghapus data" }
  }
}
