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
  midsoleSupplier?: string
  midsoleStatus?: string

  outsoleTargetColor?: string
  outsoleSupplierColor?: string
  outsoleSupplier?: string
  outsoleStatus?: string

  wedgeTargetColor?: string
  wedgeSupplierColor?: string
  wedgeSupplier?: string
  wedgeStatus?: string

  crTargetColor?: string
  crSupplierColor?: string
  crSupplier?: string
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
      { midsoleSupplier: { contains: s, mode: "insensitive" } },
      { outsoleSupplier: { contains: s, mode: "insensitive" } },
      { wedgeSupplier: { contains: s, mode: "insensitive" } },
      { crSupplier: { contains: s, mode: "insensitive" } },
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
      midsoleSupplier: data.midsoleSupplier || null,
      midsoleStatus: data.midsoleStatus || "PENDING",

      outsoleTargetColor: data.outsoleTargetColor || null,
      outsoleSupplierColor: data.outsoleSupplierColor || null,
      outsoleSupplier: data.outsoleSupplier || null,
      outsoleStatus: data.outsoleStatus || "PENDING",

      wedgeTargetColor: data.wedgeTargetColor || null,
      wedgeSupplierColor: data.wedgeSupplierColor || null,
      wedgeSupplier: data.wedgeSupplier || null,
      wedgeStatus: data.wedgeStatus || "PENDING",

      crTargetColor: data.crTargetColor || null,
      crSupplierColor: data.crSupplierColor || null,
      crSupplier: data.crSupplier || null,
      crStatus: data.crStatus || "PENDING",

      notes: data.notes || null,
      devFeedback: data.devFeedback || null,
      imageUrl: data.imageUrl || null,
      trackingBatchId: data.trackingBatchId || null,
    }
  })

  // Create real-time notification
  try {
    await createNotification(
      `Color Conform #${nextSubmissionNo}: ${cleanArticle}`,
      `Konfirmasi warna diajukan ke ${data.projectDev.trim()} untuk article ${cleanArticle} (${data.modelName || "-"}).`,
      "info"
    )
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
  if (data.midsoleSupplier !== undefined) updateData.midsoleSupplier = data.midsoleSupplier
  if (data.midsoleStatus !== undefined) updateData.midsoleStatus = data.midsoleStatus

  if (data.outsoleTargetColor !== undefined) updateData.outsoleTargetColor = data.outsoleTargetColor
  if (data.outsoleSupplierColor !== undefined) updateData.outsoleSupplierColor = data.outsoleSupplierColor
  if (data.outsoleSupplier !== undefined) updateData.outsoleSupplier = data.outsoleSupplier
  if (data.outsoleStatus !== undefined) updateData.outsoleStatus = data.outsoleStatus

  if (data.wedgeTargetColor !== undefined) updateData.wedgeTargetColor = data.wedgeTargetColor
  if (data.wedgeSupplierColor !== undefined) updateData.wedgeSupplierColor = data.wedgeSupplierColor
  if (data.wedgeSupplier !== undefined) updateData.wedgeSupplier = data.wedgeSupplier
  if (data.wedgeStatus !== undefined) updateData.wedgeStatus = data.wedgeStatus

  if (data.crTargetColor !== undefined) updateData.crTargetColor = data.crTargetColor
  if (data.crSupplierColor !== undefined) updateData.crSupplierColor = data.crSupplierColor
  if (data.crSupplier !== undefined) updateData.crSupplier = data.crSupplier
  if (data.crStatus !== undefined) updateData.crStatus = data.crStatus

  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl

  const updated = await prisma.colorConformHistory.update({
    where: { id },
    data: updateData
  })

  // Create notification if status changed to Approved or Rejected
  if (data.status === "APPROVED" || data.status === "REJECTED" || data.status === "APPROVED_WITH_NOTE") {
    try {
      await createNotification(
        `Color Conform Decision: ${updated.article}`,
        `Project Developer (${updated.projectDev}) telah memberikan keputusan: ${data.status} untuk article ${updated.article}.`,
        data.status === "APPROVED" ? "success" : (data.status === "REJECTED" ? "warning" : "info")
      )
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

// ==========================================
// 7. DRAWER ARCHITECTURE: PER-COMPONENT CFM
// ==========================================

export interface ComponentCfmInput {
  article: string
  modelName?: string
  component: "MIDSOLE" | "OUTSOLE" | "WEDGE" | "CR"
  targetColor: string
  supplierColor?: string
  supplier?: string
  projectDev: string
  confirmDate?: Date | string
  notes?: string
  imageUrl?: string
  trackingBatchId?: string
}

export interface ComponentStatusSummary {
  targetColor: string | null
  supplier: string | null
  status: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | "APPROVED_WITH_NOTE"
  roundsCount: number
  latestRoundNo: number
  latestSampleColor: string | null
  latestConfirmDate: Date | null
  latestApprovalDate: Date | null
  latestNotes: string | null
  latestFeedback: string | null
  latestId: string | null
}

export interface ArticleConformSummary {
  article: string
  modelName: string | null
  imageUrl: string | null
  projectDev: string
  supplier: string | null
  trackingBatchId: string | null
  midsole: ComponentStatusSummary
  outsole: ComponentStatusSummary
  wedge: ComponentStatusSummary
  cr: ComponentStatusSummary
  overallStatus: "ALL_APPROVED" | "PENDING_REVIEW" | "REJECTED" | "IN_PROGRESS" | "NOT_STARTED"
  approvedCount: number
  totalRounds: number
  lastUpdated: Date
}

// 7a. Get Grouped Article Summaries for Table
export async function getGroupedConformArticles(params?: {
  search?: string
  statusFilter?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Fetch all conform histories
  const allEntries = await prisma.colorConformHistory.findMany({
    orderBy: [
      { confirmDate: "desc" },
      { submissionNo: "desc" },
      { createdAt: "desc" }
    ]
  })

  // Fetch tracking articles for metadata & fallback colors
  const trackingRows = await prisma.purchaseTracking.findMany({
    distinct: ["article"],
    orderBy: { article: "asc" },
    select: {
      batchId: true,
      article: true,
      modelName: true,
      supplier: true,
      midsoleColor: true,
      outsoleColor: true,
      wedgeColor: true,
      crDeviceColor: true,
      imageUrl: true,
    }
  })

  const trackingMap = new Map<string, typeof trackingRows[0]>()
  for (const t of trackingRows) {
    trackingMap.set(t.article.toUpperCase(), t)
  }

  // Group conform entries by article
  const articleGroups = new Map<string, typeof allEntries>()
  for (const entry of allEntries) {
    const artKey = entry.article.toUpperCase()
    if (!articleGroups.has(artKey)) {
      articleGroups.set(artKey, [])
    }
    articleGroups.get(artKey)!.push(entry)
  }

  // Also include tracking articles if not in conform history
  for (const t of trackingRows) {
    const artKey = t.article.toUpperCase()
    if (!articleGroups.has(artKey)) {
      articleGroups.set(artKey, [])
    }
  }

  const summaries: ArticleConformSummary[] = []

  for (const [artKey, entries] of articleGroups.entries()) {
    const tracking = trackingMap.get(artKey)
    const firstEntry = entries[0]

    const modelName = firstEntry?.modelName || tracking?.modelName || "-"
    const projectDev = firstEntry?.projectDev || "-"
    const supplier = firstEntry?.supplier || tracking?.supplier || "-"
    const trackingBatchId = firstEntry?.trackingBatchId || tracking?.batchId || null
    const imageUrl = tracking?.imageUrl || firstEntry?.imageUrl || null

    const parseComponentRounds = (compKey: "MIDSOLE" | "OUTSOLE" | "WEDGE" | "CR", defaultTargetColor: string | null) => {
      // Find all rounds for this component
      const compEntries = entries.filter((e) => {
        if (e.component) return e.component.toUpperCase() === compKey
        // Legacy fallback
        if (compKey === "MIDSOLE") return !!(e.midsoleTargetColor || e.midsoleSupplierColor)
        if (compKey === "OUTSOLE") return !!(e.outsoleTargetColor || e.outsoleSupplierColor)
        if (compKey === "WEDGE") return !!(e.wedgeTargetColor || e.wedgeSupplierColor)
        if (compKey === "CR") return !!(e.crTargetColor || e.crSupplierColor)
        return false
      })

      // Sort by submissionNo asc, then confirmDate asc
      compEntries.sort((a, b) => a.submissionNo - b.submissionNo)

      if (compEntries.length === 0) {
        return {
          targetColor: defaultTargetColor || null,
          supplier: tracking?.supplier || null,
          status: "NOT_SUBMITTED" as const,
          roundsCount: 0,
          latestRoundNo: 0,
          latestSampleColor: null,
          latestConfirmDate: null,
          latestApprovalDate: null,
          latestNotes: null,
          latestFeedback: null,
          latestId: null,
        }
      }

      const latest = compEntries[compEntries.length - 1]
      let status = (latest.status || "PENDING") as ComponentStatusSummary["status"]
      if (latest.component) {
        status = latest.status as ComponentStatusSummary["status"]
      } else {
        // Legacy per-component status fallback
        if (compKey === "MIDSOLE" && latest.midsoleStatus) status = latest.midsoleStatus as ComponentStatusSummary["status"]
        if (compKey === "OUTSOLE" && latest.outsoleStatus) status = latest.outsoleStatus as ComponentStatusSummary["status"]
        if (compKey === "WEDGE" && latest.wedgeStatus) status = latest.wedgeStatus as ComponentStatusSummary["status"]
        if (compKey === "CR" && latest.crStatus) status = latest.crStatus as ComponentStatusSummary["status"]
      }

      let targetColor = latest.targetColor
      let supplierColor = latest.supplierColor
      let compSupplier = latest.supplier

      if (!latest.component) {
        if (compKey === "MIDSOLE") {
          targetColor = latest.midsoleTargetColor || targetColor
          supplierColor = latest.midsoleSupplierColor || supplierColor
          compSupplier = latest.midsoleSupplier || compSupplier
        } else if (compKey === "OUTSOLE") {
          targetColor = latest.outsoleTargetColor || targetColor
          supplierColor = latest.outsoleSupplierColor || supplierColor
          compSupplier = latest.outsoleSupplier || compSupplier
        } else if (compKey === "WEDGE") {
          targetColor = latest.wedgeTargetColor || targetColor
          supplierColor = latest.wedgeSupplierColor || supplierColor
          compSupplier = latest.wedgeSupplier || compSupplier
        } else if (compKey === "CR") {
          targetColor = latest.crTargetColor || targetColor
          supplierColor = latest.crSupplierColor || supplierColor
          compSupplier = latest.crSupplier || compSupplier
        }
      }

      return {
        targetColor: targetColor || defaultTargetColor || null,
        supplier: compSupplier || tracking?.supplier || null,
        status,
        roundsCount: compEntries.length,
        latestRoundNo: latest.submissionNo,
        latestSampleColor: supplierColor || null,
        latestConfirmDate: latest.confirmDate,
        latestApprovalDate: latest.approvalDate,
        latestNotes: latest.notes,
        latestFeedback: latest.devFeedback,
        latestId: latest.id,
      }
    }

    const midsole = parseComponentRounds("MIDSOLE", tracking?.midsoleColor || null)
    const outsole = parseComponentRounds("OUTSOLE", tracking?.outsoleColor || null)
    const wedge = parseComponentRounds("WEDGE", tracking?.wedgeColor || null)
    const cr = parseComponentRounds("CR", tracking?.crDeviceColor || null)

    const allComps = [midsole, outsole, wedge, cr]
    // Filter active components (either submitted or have target color)
    const activeComps = allComps.filter(c => c.roundsCount > 0 || c.targetColor)
    const effectiveComps = activeComps.length > 0 ? activeComps : allComps

    const approvedCount = effectiveComps.filter(c => c.status === "APPROVED" || c.status === "APPROVED_WITH_NOTE").length
    const hasPending = effectiveComps.some(c => c.status === "PENDING")
    const hasRejected = effectiveComps.some(c => c.status === "REJECTED")
    const totalRounds = midsole.roundsCount + outsole.roundsCount + wedge.roundsCount + cr.roundsCount

    let overallStatus: ArticleConformSummary["overallStatus"] = "NOT_STARTED"
    if (effectiveComps.length > 0 && approvedCount === effectiveComps.length) {
      overallStatus = "ALL_APPROVED"
    } else if (hasPending) {
      overallStatus = "PENDING_REVIEW"
    } else if (hasRejected) {
      overallStatus = "REJECTED"
    } else if (totalRounds > 0) {
      overallStatus = "IN_PROGRESS"
    }

    const latestDate = firstEntry?.confirmDate || new Date(0)

    summaries.push({
      article: artKey,
      modelName,
      imageUrl,
      projectDev,
      supplier,
      trackingBatchId,
      midsole,
      outsole,
      wedge,
      cr,
      overallStatus,
      approvedCount,
      totalRounds,
      lastUpdated: latestDate,
    })
  }

  // Filter by params
  let filtered = summaries
  if (params?.search && params.search.trim() !== "") {
    const s = params.search.trim().toLowerCase()
    filtered = filtered.filter(item => 
      item.article.toLowerCase().includes(s) ||
      (item.modelName && item.modelName.toLowerCase().includes(s)) ||
      (item.projectDev && item.projectDev.toLowerCase().includes(s)) ||
      (item.supplier && item.supplier.toLowerCase().includes(s)) ||
      (item.midsole.supplier && item.midsole.supplier.toLowerCase().includes(s)) ||
      (item.outsole.supplier && item.outsole.supplier.toLowerCase().includes(s)) ||
      (item.wedge.supplier && item.wedge.supplier.toLowerCase().includes(s)) ||
      (item.cr.supplier && item.cr.supplier.toLowerCase().includes(s))
    )
  }

  if (params?.statusFilter && params.statusFilter !== "ALL") {
    if (params.statusFilter === "ALL_APPROVED") {
      filtered = filtered.filter(i => i.overallStatus === "ALL_APPROVED")
    } else if (params.statusFilter === "PENDING") {
      filtered = filtered.filter(i => i.overallStatus === "PENDING_REVIEW")
    } else if (params.statusFilter === "REJECTED") {
      filtered = filtered.filter(i => i.overallStatus === "REJECTED")
    } else if (params.statusFilter === "SUBMITTED") {
      filtered = filtered.filter(i => i.totalRounds > 0)
    }
  }

  // Sort: articles with submissions first, then by lastUpdated desc
  filtered.sort((a, b) => {
    if (a.totalRounds > 0 && b.totalRounds === 0) return -1
    if (a.totalRounds === 0 && b.totalRounds > 0) return 1
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  })

  // Global counts
  const totalArticles = summaries.length
  const submittedArticles = summaries.filter(s => s.totalRounds > 0).length
  const allApprovedArticles = summaries.filter(s => s.overallStatus === "ALL_APPROVED").length
  const pendingArticles = summaries.filter(s => s.overallStatus === "PENDING_REVIEW").length
  const rejectedArticles = summaries.filter(s => s.overallStatus === "REJECTED").length

  return {
    summaries: filtered,
    stats: {
      total: totalArticles,
      submitted: submittedArticles,
      approved: allApprovedArticles,
      pending: pendingArticles,
      rejected: rejectedArticles,
    }
  }
}

// 7b. Get Full Article Details & CFM Rounds for the Side Drawer
export async function getArticleConformDetails(article: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const cleanArticle = article.trim().toUpperCase()

  const tracking = await prisma.purchaseTracking.findFirst({
    where: { article: { equals: cleanArticle, mode: "insensitive" } },
    select: {
      batchId: true,
      article: true,
      modelName: true,
      supplier: true,
      midsoleColor: true,
      outsoleColor: true,
      wedgeColor: true,
      crDeviceColor: true,
      imageUrl: true,
    }
  })

  const rawEntries = await prisma.colorConformHistory.findMany({
    where: { article: { equals: cleanArticle, mode: "insensitive" } },
    orderBy: [
      { confirmDate: "asc" },
      { submissionNo: "asc" },
      { createdAt: "asc" }
    ]
  })

  // Build rounds for each of the 4 components
  const buildRoundsFor = (compKey: "MIDSOLE" | "OUTSOLE" | "WEDGE" | "CR", defaultTargetColor: string | null) => {
    const list = rawEntries.filter((e) => {
      if (e.component) return e.component.toUpperCase() === compKey
      if (compKey === "MIDSOLE") return !!(e.midsoleTargetColor || e.midsoleSupplierColor)
      if (compKey === "OUTSOLE") return !!(e.outsoleTargetColor || e.outsoleSupplierColor)
      if (compKey === "WEDGE") return !!(e.wedgeTargetColor || e.wedgeSupplierColor)
      if (compKey === "CR") return !!(e.crTargetColor || e.crSupplierColor)
      return false
    })

    list.sort((a, b) => a.submissionNo - b.submissionNo)

    return list.map((item, index) => {
      let status = item.status
      let targetColor = item.targetColor
      let supplierColor = item.supplierColor
      let supplier = item.supplier

      if (!item.component) {
        if (compKey === "MIDSOLE") {
          status = item.midsoleStatus || status
          targetColor = item.midsoleTargetColor || targetColor
          supplierColor = item.midsoleSupplierColor || supplierColor
          supplier = item.midsoleSupplier || supplier
        } else if (compKey === "OUTSOLE") {
          status = item.outsoleStatus || status
          targetColor = item.outsoleTargetColor || targetColor
          supplierColor = item.outsoleSupplierColor || supplierColor
          supplier = item.outsoleSupplier || supplier
        } else if (compKey === "WEDGE") {
          status = item.wedgeStatus || status
          targetColor = item.wedgeTargetColor || targetColor
          supplierColor = item.wedgeSupplierColor || supplierColor
          supplier = item.wedgeSupplier || supplier
        } else if (compKey === "CR") {
          status = item.crStatus || status
          targetColor = item.crTargetColor || targetColor
          supplierColor = item.crSupplierColor || supplierColor
          supplier = item.crSupplier || supplier
        }
      }

      return {
        id: item.id,
        roundNo: item.submissionNo || (index + 1),
        component: compKey,
        targetColor: targetColor || defaultTargetColor || "-",
        supplierColor: supplierColor || "-",
        supplier: supplier || tracking?.supplier || "-",
        status: status || "PENDING",
        confirmDate: item.confirmDate,
        approvalDate: item.approvalDate,
        projectDev: item.projectDev,
        requesterName: item.requesterName || "Operator",
        notes: item.notes,
        devFeedback: item.devFeedback,
        imageUrl: item.imageUrl,
      }
    })
  }

  const midsoleRounds = buildRoundsFor("MIDSOLE", tracking?.midsoleColor || null)
  const outsoleRounds = buildRoundsFor("OUTSOLE", tracking?.outsoleColor || null)
  const wedgeRounds = buildRoundsFor("WEDGE", tracking?.wedgeColor || null)
  const crRounds = buildRoundsFor("CR", tracking?.crDeviceColor || null)

  return {
    article: cleanArticle,
    modelName: tracking?.modelName || rawEntries[0]?.modelName || "-",
    defaultSupplier: tracking?.supplier || rawEntries[0]?.supplier || "-",
    projectDev: rawEntries[0]?.projectDev || "-",
    trackingBatchId: tracking?.batchId || rawEntries[0]?.trackingBatchId || null,
    imageUrl: tracking?.imageUrl || rawEntries[0]?.imageUrl || null,
    components: {
      MIDSOLE: {
        targetColor: tracking?.midsoleColor || midsoleRounds[0]?.targetColor || "-",
        defaultSupplier: midsoleRounds[midsoleRounds.length - 1]?.supplier || tracking?.supplier || "",
        rounds: midsoleRounds,
        currentStatus: midsoleRounds.length > 0 ? midsoleRounds[midsoleRounds.length - 1].status : "NOT_SUBMITTED",
      },
      OUTSOLE: {
        targetColor: tracking?.outsoleColor || outsoleRounds[0]?.targetColor || "-",
        defaultSupplier: outsoleRounds[outsoleRounds.length - 1]?.supplier || tracking?.supplier || "",
        rounds: outsoleRounds,
        currentStatus: outsoleRounds.length > 0 ? outsoleRounds[outsoleRounds.length - 1].status : "NOT_SUBMITTED",
      },
      WEDGE: {
        targetColor: tracking?.wedgeColor || wedgeRounds[0]?.targetColor || "-",
        defaultSupplier: wedgeRounds[wedgeRounds.length - 1]?.supplier || tracking?.supplier || "",
        rounds: wedgeRounds,
        currentStatus: wedgeRounds.length > 0 ? wedgeRounds[wedgeRounds.length - 1].status : "NOT_SUBMITTED",
      },
      CR: {
        targetColor: tracking?.crDeviceColor || crRounds[0]?.targetColor || "-",
        defaultSupplier: crRounds[crRounds.length - 1]?.supplier || tracking?.supplier || "",
        rounds: crRounds,
        currentStatus: crRounds.length > 0 ? crRounds[crRounds.length - 1].status : "NOT_SUBMITTED",
      },
    }
  }
}

// 7c. Submit a New CFM Round for a Specific Component
export async function submitComponentCfmRound(data: ComponentCfmInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const cleanArticle = data.article.trim().toUpperCase()
  const comp = data.component.toUpperCase() as "MIDSOLE" | "OUTSOLE" | "WEDGE" | "CR"

  // Count existing rounds for this component
  const existingRounds = await prisma.colorConformHistory.count({
    where: {
      article: { equals: cleanArticle, mode: "insensitive" },
      OR: [
        { component: comp },
        ...(comp === "MIDSOLE" ? [{ midsoleTargetColor: { not: null }, component: null }] : []),
        ...(comp === "OUTSOLE" ? [{ outsoleTargetColor: { not: null }, component: null }] : []),
        ...(comp === "WEDGE" ? [{ wedgeTargetColor: { not: null }, component: null }] : []),
        ...(comp === "CR" ? [{ crTargetColor: { not: null }, component: null }] : []),
      ]
    }
  })

  const nextRoundNo = existingRounds + 1

  // Populate legacy fields as well for backward compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacyFields: Record<string, any> = {}
  if (comp === "MIDSOLE") {
    legacyFields.midsoleTargetColor = data.targetColor
    legacyFields.midsoleSupplierColor = data.supplierColor || null
    legacyFields.midsoleSupplier = data.supplier || null
    legacyFields.midsoleStatus = "PENDING"
  } else if (comp === "OUTSOLE") {
    legacyFields.outsoleTargetColor = data.targetColor
    legacyFields.outsoleSupplierColor = data.supplierColor || null
    legacyFields.outsoleSupplier = data.supplier || null
    legacyFields.outsoleStatus = "PENDING"
  } else if (comp === "WEDGE") {
    legacyFields.wedgeTargetColor = data.targetColor
    legacyFields.wedgeSupplierColor = data.supplierColor || null
    legacyFields.wedgeSupplier = data.supplier || null
    legacyFields.wedgeStatus = "PENDING"
  } else if (comp === "CR") {
    legacyFields.crTargetColor = data.targetColor
    legacyFields.crSupplierColor = data.supplierColor || null
    legacyFields.crSupplier = data.supplier || null
    legacyFields.crStatus = "PENDING"
  }

  const entry = await prisma.colorConformHistory.create({
    data: {
      article: cleanArticle,
      modelName: data.modelName || "-",
      component: comp,
      submissionNo: nextRoundNo,
      supplier: data.supplier || null,
      targetColor: data.targetColor || null,
      supplierColor: data.supplierColor || null,
      projectDev: data.projectDev.trim(),
      requesterName: session.user.name || "Operator",
      confirmDate: data.confirmDate ? new Date(data.confirmDate) : new Date(),
      status: "PENDING",
      notes: data.notes || null,
      imageUrl: data.imageUrl || null,
      trackingBatchId: data.trackingBatchId || null,
      ...legacyFields
    }
  })

  try {
    await createNotification(
      `CFM #${nextRoundNo} (${comp}): ${cleanArticle}`,
      `Pengajuan konfirmasi warna ${comp} round #${nextRoundNo} diajukan ke ${data.projectDev.trim()} (${cleanArticle}).`,
      "info"
    )
  } catch (err) {
    console.error("Failed to create notification", err)
  }

  revalidatePath("/conform-history")
  revalidatePath("/tracking")

  return { 
    success: true, 
    message: `CFM ${comp} round #${nextRoundNo} untuk artikel ${cleanArticle} berhasil diajukan.`, 
    data: entry 
  }
}

// 7d. Review a CFM Round (Project Developer Decision)
export async function reviewComponentCfmRound(id: string, data: {
  status: string
  devFeedback?: string
  projectDev?: string
  approvalDate?: Date | string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const existing = await prisma.colorConformHistory.findUnique({ where: { id } })
  if (!existing) throw new Error("Data konfirmasi tidak ditemukan")

  const approvalDate = data.approvalDate ? new Date(data.approvalDate) : new Date()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacyStatusUpdate: Record<string, any> = {}
  const comp = existing.component
  if (comp === "MIDSOLE") legacyStatusUpdate.midsoleStatus = data.status
  else if (comp === "OUTSOLE") legacyStatusUpdate.outsoleStatus = data.status
  else if (comp === "WEDGE") legacyStatusUpdate.wedgeStatus = data.status
  else if (comp === "CR") legacyStatusUpdate.crStatus = data.status

  const updated = await prisma.colorConformHistory.update({
    where: { id },
    data: {
      status: data.status,
      devFeedback: data.devFeedback || null,
      approvalDate,
      ...(data.projectDev ? { projectDev: data.projectDev } : {}),
      ...legacyStatusUpdate
    }
  })

  try {
    await createNotification(
      `Keputusan PD: ${updated.component || "CFM"} ${updated.article} #${updated.submissionNo}`,
      `Keputusan: ${data.status} oleh ${updated.projectDev}. Catatan: ${data.devFeedback || "-"}`,
      data.status === "APPROVED" ? "success" : (data.status === "REJECTED" ? "warning" : "info")
    )
  } catch {}

  revalidatePath("/conform-history")
  revalidatePath("/tracking")

  return { 
    success: true, 
    message: `Keputusan untuk ${updated.component || "komponen"} round #${updated.submissionNo} berhasil disimpan.`, 
    data: updated 
  }
}

// 7e. Custom Update Project Developer & Supplier for an Article
export async function updateArticleDevAndSupplier(data: {
  article: string
  projectDev: string
  supplier?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const cleanArticle = data.article.trim().toUpperCase()
  const dev = data.projectDev.trim() || "-"
  const supp = data.supplier !== undefined ? (data.supplier.trim() || null) : undefined

  // Update existing entries in colorConformHistory
  await prisma.colorConformHistory.updateMany({
    where: { article: { equals: cleanArticle, mode: "insensitive" } },
    data: {
      projectDev: dev,
      ...(supp !== undefined ? { supplier: supp } : {})
    }
  })

  // Also update PurchaseTracking if supplier changed
  if (supp !== undefined) {
    try {
      await prisma.purchaseTracking.updateMany({
        where: { article: { equals: cleanArticle, mode: "insensitive" } },
        data: { supplier: supp }
      })
    } catch {
      // ignore
    }
  }

  revalidatePath("/conform-history")
  revalidatePath("/tracking")
  return { success: true, message: "Developer & Vendor berhasil diperbarui" }
}
