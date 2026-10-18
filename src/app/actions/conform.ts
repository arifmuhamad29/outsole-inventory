"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createNotification } from "./notification"
import { revalidatePath } from "next/cache"

export interface ConformEntryInput {
  article: string
  modelName?: string
  supplier?: string
  projectDev: string
  requesterName?: string
  confirmDate?: Date | string
  status?: string
  approvalDate?: Date | string | null

  // 4 Bottom Components
  midsoleTargetColor?: string
  midsoleSupplierColor?: string
  midsoleStatus?: string

  outsoleTargetColor?: string
  outsoleSupplierColor?: string
  outsoleStatus?: string

  wedgeTargetColor?: string
  wedgeSupplierColor?: string
  wedgeStatus?: string

  crTargetColor?: string
  crSupplierColor?: string
  crStatus?: string

  notes?: string
  devFeedback?: string
  imageUrl?: string
  trackingBatchId?: string
}

// ==========================================
// 1. GET ALL CONFORM HISTORIES
// ==========================================
export async function getConformHistories(params?: {
  search?: string
  status?: string
  article?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (params?.status && params.status !== "ALL") {
    where.status = params.status
  }

  if (params?.article && params.article.trim() !== "") {
    where.article = { contains: params.article.trim(), mode: "insensitive" }
  }

  if (params?.search && params.search.trim() !== "") {
    const s = params.search.trim()
    where.OR = [
      { article: { contains: s, mode: "insensitive" } },
      { modelName: { contains: s, mode: "insensitive" } },
      { projectDev: { contains: s, mode: "insensitive" } },
      { supplier: { contains: s, mode: "insensitive" } },
      { notes: { contains: s, mode: "insensitive" } },
      { devFeedback: { contains: s, mode: "insensitive" } },
    ]
  }

  const entries = await prisma.colorConformHistory.findMany({
    where,
    orderBy: [
      { confirmDate: "desc" },
      { submissionNo: "desc" },
      { createdAt: "desc" }
    ],
  })

  // Summary counts
  const totalCount = await prisma.colorConformHistory.count()
  const pendingCount = await prisma.colorConformHistory.count({ where: { status: "PENDING" } })
  const approvedCount = await prisma.colorConformHistory.count({ 
    where: { status: { in: ["APPROVED", "APPROVED_WITH_NOTE"] } } 
  })
  const rejectedCount = await prisma.colorConformHistory.count({ where: { status: "REJECTED" } })

  return {
    entries,
    stats: {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    }
  }
}

// ==========================================
// 2. GET TIMELINE / HISTORY FOR AN ARTICLE
// ==========================================
export async function getConformTimelineByArticle(article: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return await prisma.colorConformHistory.findMany({
    where: { article: { equals: article.trim(), mode: "insensitive" } },
    orderBy: { submissionNo: "asc" }
  })
}

// ==========================================
// 3. GET ARTICLES FROM PURCHASE TRACKING
// (Used for auto-filling article dropdown)
// ==========================================
export async function getArticlesFromTracking() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const trackingRows = await prisma.purchaseTracking.findMany({
    distinct: ["article"],
    orderBy: { article: "asc" },
    select: {
      batchId: true,
      article: true,
      modelName: true,
      supplier: true,
      midsoleColor: true,
      midsoleMaterial: true,
      outsoleColor: true,
      outsoleMaterial: true,
      wedgeColor: true,
      wedgeMaterial: true,
      crDeviceColor: true,
      crDeviceMaterial: true,
      imageUrl: true,
    }
  })

  return trackingRows
}

// ==========================================
// 4. CREATE NEW CONFORM RECORD
// ==========================================
export async function createConformEntry(data: ConformEntryInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const cleanArticle = data.article.trim().toUpperCase()

  // Calculate submissionNo automatically based on existing records for this article
  const existingCount = await prisma.colorConformHistory.count({
    where: { article: { equals: cleanArticle, mode: "insensitive" } }
  })
  const nextSubmissionNo = existingCount + 1

  const entry = await prisma.colorConformHistory.create({
    data: {
      article: cleanArticle,
      modelName: data.modelName || "-",
      submissionNo: nextSubmissionNo,
      supplier: data.supplier || "-",
      projectDev: data.projectDev.trim(),
      requesterName: data.requesterName || session.user.name || "Operator",
      confirmDate: data.confirmDate ? new Date(data.confirmDate) : new Date(),
      status: data.status || "PENDING",
      approvalDate: data.approvalDate ? new Date(data.approvalDate) : null,

      midsoleTargetColor: data.midsoleTargetColor || null,
      midsoleSupplierColor: data.midsoleSupplierColor || null,
      midsoleStatus: data.midsoleStatus || "PENDING",

      outsoleTargetColor: data.outsoleTargetColor || null,
      outsoleSupplierColor: data.outsoleSupplierColor || null,
      outsoleStatus: data.outsoleStatus || "PENDING",

      wedgeTargetColor: data.wedgeTargetColor || null,
      wedgeSupplierColor: data.wedgeSupplierColor || null,
      wedgeStatus: data.wedgeStatus || "PENDING",

      crTargetColor: data.crTargetColor || null,
      crSupplierColor: data.crSupplierColor || null,
      crStatus: data.crStatus || "PENDING",

      notes: data.notes || null,
      devFeedback: data.devFeedback || null,
      imageUrl: data.imageUrl || null,
      trackingBatchId: data.trackingBatchId || null,
    }
  })

  // Create real-time notification
  try {
    await createNotification({
      title: `Color Conform #${nextSubmissionNo}: ${cleanArticle}`,
      message: `Konfirmasi warna diajukan ke ${data.projectDev.trim()} untuk article ${cleanArticle} (${data.modelName || "-"}).`,
      type: "info"
    })
  } catch (err) {
    console.error("Failed to create notification", err)
  }

  revalidatePath("/conform-history")
  revalidatePath("/tracking")

  return { success: true, message: `Conform submission #${nextSubmissionNo} untuk artikel ${cleanArticle} berhasil dicatat.`, data: entry }
}

// ==========================================
// 5. UPDATE CONFORM RECORD (e.g. PD Review)
// ==========================================
export async function updateConformEntry(id: string, data: Partial<ConformEntryInput>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}

  if (data.status !== undefined) updateData.status = data.status
  if (data.projectDev !== undefined) updateData.projectDev = data.projectDev
  if (data.devFeedback !== undefined) updateData.devFeedback = data.devFeedback
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.approvalDate !== undefined) {
    updateData.approvalDate = data.approvalDate ? new Date(data.approvalDate) : null
  } else if (data.status === "APPROVED" || data.status === "APPROVED_WITH_NOTE" || data.status === "REJECTED") {
    updateData.approvalDate = new Date()
  }

  if (data.midsoleTargetColor !== undefined) updateData.midsoleTargetColor = data.midsoleTargetColor
  if (data.midsoleSupplierColor !== undefined) updateData.midsoleSupplierColor = data.midsoleSupplierColor
  if (data.midsoleStatus !== undefined) updateData.midsoleStatus = data.midsoleStatus

  if (data.outsoleTargetColor !== undefined) updateData.outsoleTargetColor = data.outsoleTargetColor
  if (data.outsoleSupplierColor !== undefined) updateData.outsoleSupplierColor = data.outsoleSupplierColor
  if (data.outsoleStatus !== undefined) updateData.outsoleStatus = data.outsoleStatus

  if (data.wedgeTargetColor !== undefined) updateData.wedgeTargetColor = data.wedgeTargetColor
  if (data.wedgeSupplierColor !== undefined) updateData.wedgeSupplierColor = data.wedgeSupplierColor
  if (data.wedgeStatus !== undefined) updateData.wedgeStatus = data.wedgeStatus

  if (data.crTargetColor !== undefined) updateData.crTargetColor = data.crTargetColor
  if (data.crSupplierColor !== undefined) updateData.crSupplierColor = data.crSupplierColor
  if (data.crStatus !== undefined) updateData.crStatus = data.crStatus

  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl

  const updated = await prisma.colorConformHistory.update({
    where: { id },
    data: updateData
  })

  // Create notification if status changed to Approved or Rejected
  if (data.status === "APPROVED" || data.status === "REJECTED" || data.status === "APPROVED_WITH_NOTE") {
    try {
      await createNotification({
        title: `Color Conform Decision: ${updated.article}`,
        message: `Project Developer (${updated.projectDev}) telah memberikan keputusan: ${data.status} untuk article ${updated.article}.`,
        type: data.status === "APPROVED" ? "success" : (data.status === "REJECTED" ? "warning" : "info")
      })
    } catch {
      // Ignore notification error
    }
  }

  revalidatePath("/conform-history")
  revalidatePath("/tracking")

  return { success: true, message: "Status konfirmasi berhasil diperbarui.", data: updated }
}

// ==========================================
// 6. DELETE CONFORM RECORD
// ==========================================
export async function deleteConformEntry(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.colorConformHistory.delete({
    where: { id }
  })

  revalidatePath("/conform-history")
  revalidatePath("/tracking")

  return { success: true, message: "Data conform berhasil dihapus." }
}
