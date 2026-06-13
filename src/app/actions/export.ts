"use server"

import prisma from "@/lib/prisma"

// ============================================================
// EXPORT SERVER ACTIONS — Fetches all records (no pagination)
// for Excel export via the Reports page.
// ============================================================

export async function exportInventoryData() {
  const items = await prisma.outsole.findMany({
    where: { isActive: true },
    orderBy: [{ model: "asc" }, { article: "asc" }, { size: "asc" }],
  })

  return items.map((item) => ({
    "QR Code": item.qrCode,
    Model: item.model,
    Article: item.article,
    Color: item.color,
    Size: item.size,
    Stock: item.stock,
    "Minimum Stock": item.minimumStock,
    "PO Number": item.poNumber,
    "Bottom Treatment": item.bottomTreatment,
    Notes: item.notes || "-",
    "Created At": item.createdAt.toISOString(),
    "Updated At": item.updatedAt.toISOString(),
  }))
}

export async function exportBpmTfmData() {
  const items = await prisma.bpmTfmStock.findMany({
    orderBy: [{ codeLast: "asc" }, { toolName: "asc" }, { size: "asc" }],
  })

  return items.map((item) => ({
    "Code Last": item.codeLast,
    "Tool Name": item.toolName,
    Type: item.type || "-",
    Size: item.size,
    "Dev Stock": item.devStock,
    "Updated At": item.updatedAt.toISOString(),
  }))
}

export async function exportHandoverData() {
  const items = await prisma.handover.findMany({
    include: { items: true },
    orderBy: { date: "desc" },
  })

  // Flatten: one row per HandoverItem for a clean spreadsheet
  const rows: Record<string, string | number>[] = []

  for (const handover of items) {
    if (handover.items.length === 0) {
      rows.push({
        Date: handover.date.toISOString().split("T")[0],
        Recipient: handover.recipient,
        Giver: handover.giver,
        "Model Name": handover.modelName || "-",
        "Code Last": handover.codeLast || "-",
        "Tool Name": "-",
        Type: "-",
        Size: "-",
        Satuan: "-",
        Qty: 0,
        Remark: "-",
      })
    } else {
      for (const hi of handover.items) {
        rows.push({
          Date: handover.date.toISOString().split("T")[0],
          Recipient: handover.recipient,
          Giver: handover.giver,
          "Model Name": handover.modelName || "-",
          "Code Last": handover.codeLast || "-",
          "Tool Name": hi.toolName,
          Type: hi.type || "-",
          Size: hi.size,
          Satuan: hi.satuan,
          Qty: hi.qty,
          Remark: hi.remark || "-",
        })
      }
    }
  }

  return rows
}

export async function exportTrackingData() {
  const items = await prisma.purchaseTracking.findMany({
    orderBy: [{ batchId: "asc" }, { size: "asc" }],
  })

  // Group by batchId to flatten sizes into a single readable column
  const batchMap = new Map<string, typeof items>()
  for (const item of items) {
    const existing = batchMap.get(item.batchId) || []
    existing.push(item)
    batchMap.set(item.batchId, existing)
  }

  const rows: Record<string, string | number>[] = []

  for (const [, batchItems] of batchMap) {
    const first = batchItems[0]
    const sizesFormatted = batchItems
      .map((s) => `${s.size} (${s.quantity})`)
      .join(", ")
    const totalQty = batchItems.reduce((sum, s) => sum + s.quantity, 0)

    rows.push({
      "Batch ID": first.batchId,
      Article: first.article,
      "Model Name": first.modelName,
      "Gender Category": first.genderCategory,
      "Midsole Material": first.midsoleMaterial || "-",
      "Midsole Color": first.midsoleColor || "-",
      "Outsole Material": first.outsoleMaterial || "-",
      "Outsole Color": first.outsoleColor || "-",
      "Bottom Treatment": first.bottomTreatment || "-",
      "Size Run": sizesFormatted,
      "Total QTY": totalQty,
      Status: first.isOrdered ? "ORDERED" : "PENDING",
      "PO Number": first.poNumber || "-",
      Supplier: first.supplier || "-",
      "ETA Date": first.etaDate
        ? first.etaDate.toISOString().split("T")[0]
        : "-",
      Notes: first.notes || "-",
    })
  }

  return rows
}
