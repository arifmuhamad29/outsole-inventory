import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { InboundData, OutboundData, AdjustmentData } from "@/schemas/inventory"
import { TransactionType, AuditAction } from "@prisma/client"
import crypto from "crypto"

function generateShortId() {
  return crypto.randomBytes(4).toString("hex").toUpperCase()
}

export const InventoryService = {
  async processInbound(data: InboundData, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // Find existing
      let outsole = await tx.outsole.findFirst({
        where: {
          model: data.model,
          article: data.article,
          color: data.color,
          size: data.size,
        }
      })

      let action: AuditAction = "STOCK_IN"
      const beforeData = outsole ? { stock: outsole.stock } : null

      if (!outsole) {
        // Create new
        const shortId = generateShortId()
        outsole = await tx.outsole.create({
          data: {
            qrCode: `OSL-${shortId}`,
            model: data.model,
            article: data.article,
            color: data.color,
            size: data.size,
            stock: data.qty,
          }
        })
        action = "CREATE"
      } else {
        // Update stock
        outsole = await tx.outsole.update({
          where: { id: outsole.id },
          data: {
            stock: { increment: data.qty }
          }
        })
      }

      // Record transaction
      await tx.transaction.create({
        data: {
          outsoleId: outsole.id,
          userId,
          type: TransactionType.INBOUND,
          qty: data.qty,
          notes: data.notes || "Inbound via system",
        }
      })

      // Record audit log
      await tx.auditLog.create({
        data: {
          userId,
          action,
          entityName: "Outsole",
          entityId: outsole.id,
          beforeData: beforeData ? (beforeData as Prisma.InputJsonValue) : undefined,
          afterData: { stock: outsole.stock },
        }
      })

      return outsole
    })
  },

  async processOutbound(data: OutboundData, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const outsole = await tx.outsole.findUnique({
        where: { qrCode: data.qrCode }
      })

      if (!outsole) {
        throw new Error("Outsole not found for given QR Code")
      }

      const qtyToDeduct = data.quantity ?? 1

      if (outsole.stock < qtyToDeduct) {
        throw new Error(`Insufficient stock. Available: ${outsole.stock}, Requested: ${qtyToDeduct}`)
      }

      const beforeData = { stock: outsole.stock }

      const updatedOutsole = await tx.outsole.update({
        where: { id: outsole.id },
        data: { stock: { decrement: qtyToDeduct } }
      })

      await tx.transaction.create({
        data: {
          outsoleId: outsole.id,
          userId,
          type: TransactionType.OUTBOUND,
          qty: qtyToDeduct,
          notes: data.notes || "Outbound via scanner",
        }
      })

      await tx.auditLog.create({
        data: {
          userId,
          action: "STOCK_OUT",
          entityName: "Outsole",
          entityId: outsole.id,
          beforeData: beforeData as Prisma.InputJsonValue,
          afterData: { stock: updatedOutsole.stock },
        }
      })

      return updatedOutsole
    })
  },

  async processAdjustment(data: AdjustmentData, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const outsole = await tx.outsole.findUnique({
        where: { id: data.outsoleId }
      })

      if (!outsole) {
        throw new Error("Outsole not found")
      }

      const difference = data.newStock - outsole.stock
      if (difference === 0) {
        throw new Error("New stock is same as current stock")
      }

      const beforeData = { stock: outsole.stock }

      const updatedOutsole = await tx.outsole.update({
        where: { id: outsole.id },
        data: { stock: data.newStock }
      })

      await tx.transaction.create({
        data: {
          outsoleId: outsole.id,
          userId,
          type: TransactionType.ADJUSTMENT,
          qty: Math.abs(difference),
          notes: data.notes,
        }
      })

      await tx.auditLog.create({
        data: {
          userId,
          action: "STOCK_ADJUSTMENT",
          entityName: "Outsole",
          entityId: outsole.id,
          beforeData: beforeData as Prisma.InputJsonValue,
          afterData: { stock: updatedOutsole.stock },
        }
      })

      return updatedOutsole
    })
  },

  async archiveOutsole(id: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const outsole = await tx.outsole.findUnique({ where: { id } })
      if (!outsole) throw new Error("Outsole not found")
      
      const updated = await tx.outsole.update({
        where: { id },
        data: { isActive: false }
      })

      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          entityName: "Outsole",
          entityId: id,
          beforeData: { isActive: true },
          afterData: { isActive: false }
        }
      })

      return updated
    })
  },

  async hardDeleteOutsole(id: string, userId: string, password?: string) {
    if (!password) throw new Error("Password is required for permanent deletion")

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.passwordHash) throw new Error("Unauthorized")

    const bcrypt = await import("bcryptjs")
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) throw new Error("Invalid password")

    return await prisma.$transaction(async (tx) => {
      const outsole = await tx.outsole.findUnique({
        where: { id },
      })

      if (!outsole) throw new Error("Outsole not found")

      // Cascade delete child records
      await tx.transaction.deleteMany({ where: { outsoleId: id } })
      await tx.stockOpnameItem.deleteMany({ where: { outsoleId: id } })
      
      // Note: We don't necessarily delete the AuditLog of previous actions 
      // but we will delete them to prevent FK constraints if there are any.
      // Wait, AuditLog doesn't have a strict FK constraint on entityId because it's a string.
      // But if there's any relation, we clean it up. Let's stick to Transaction and StockOpnameItem.

      await tx.outsole.delete({ where: { id } })

      await tx.auditLog.create({
        data: {
          userId,
          action: "DELETE",
          entityName: "Outsole",
          entityId: id,
          beforeData: outsole as unknown as Prisma.InputJsonValue,
          afterData: Prisma.DbNull
        }
      })

      return true
    })
  }
}
