"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function createOpnameSessionAction(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }
    if (session.user.role !== "ADMIN") return { success: false, message: "Forbidden" }

    const name = formData.get("name") as string
    if (!name) return { success: false, message: "Name is required" }

    const opnameSession = await prisma.stockOpnameSession.create({
      data: {
        sessionName: name,
        createdById: session.user.id,
      }
    })

    revalidatePath("/opname")
    return { success: true, sessionId: opnameSession.id }
  } catch (error) {
    console.error("Opname Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "Failed to create session" }
  }
}



export async function submitOpnameItemAction(sessionId: string, qrCode: string, physicalStock: number) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { success: false, message: "Forbidden" }

    const outsole = await prisma.outsole.findUnique({ where: { qrCode } })
    if (!outsole) return { success: false, message: "Outsole not found" }

    const opnameSession = await prisma.stockOpnameSession.findUnique({ where: { id: sessionId } })
    if (!opnameSession) {
      return { success: false, message: "Invalid session" }
    }

    const difference = physicalStock - outsole.stock

    const existingItem = await prisma.stockOpnameItem.findFirst({
      where: {
        sessionId,
        outsoleId: outsole.id
      }
    })

    if (existingItem) {
      await prisma.stockOpnameItem.update({
        where: { id: existingItem.id },
        data: {
          physicalStock,
          difference
        }
      })
    } else {
      await prisma.stockOpnameItem.create({
        data: {
          sessionId,
          outsoleId: outsole.id,
          systemStock: outsole.stock,
          physicalStock,
          difference
        }
      })
    }

    revalidatePath(`/opname/${sessionId}`)
    return { success: true, message: "Saved" }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Error" }
  }
}

export async function deleteStockOpnameSessionAction(id: string, password?: string) {
  try {
    if (!password) return { success: false, message: "Password is required" }

    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }
    if (session.user.role !== "ADMIN") return { success: false, message: "Forbidden: Only ADMIN can delete permanently" }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || !user.passwordHash) return { success: false, message: "Unauthorized" }

    const bcrypt = await import("bcryptjs")
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) return { success: false, message: "Invalid password" }

    await prisma.$transaction(async (tx) => {
      const opname = await tx.stockOpnameSession.findUnique({ where: { id } })
      if (!opname) throw new Error("Session not found")

      // Cascade delete child records
      await tx.stockOpnameItem.deleteMany({ where: { sessionId: id } })
      
      // Delete parent
      await tx.stockOpnameSession.delete({ where: { id } })

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE",
          entityName: "StockOpnameSession",
          entityId: id,
          beforeData: opname as unknown as Prisma.InputJsonValue,
          afterData: Prisma.DbNull
        }
      })
    })

    revalidatePath("/opname")
    revalidatePath("/") // update dashboard transaction counts

    return { success: true, message: "Session permanently deleted" }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to delete" }
  }
}
