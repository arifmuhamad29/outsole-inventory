import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { type } = await params
    let csvStr = ""
    const filename = `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`

    if (type === "inventory") {
      const data = await prisma.outsole.findMany({ where: { isActive: true } })
      csvStr = "ID,QR_CODE,MODEL,COLOR,SIZE,STOCK,UPDATED_AT\n" + data.map(d => 
        `"${d.id}","${d.qrCode}","${d.model}","${d.color}",${d.size},${d.stock},"${d.updatedAt.toISOString()}"`
      ).join("\n")
    } else if (type === "transactions") {
      const data = await prisma.transaction.findMany({ include: { outsole: true, user: true } })
      csvStr = "ID,DATE,TYPE,USER,OUTSOLE_MODEL,OUTSOLE_SIZE,QTY,NOTES\n" + data.map(d => 
        `"${d.id}","${d.createdAt.toISOString()}","${d.type}","${d.user.email}","${d.outsole.model}",${d.outsole.size},${d.qty},"${d.notes || ""}"`
      ).join("\n")
    } else if (type === "audit") {
      const data = await prisma.auditLog.findMany({ include: { user: true } })
      csvStr = "ID,DATE,USER,ACTION,ENTITY,ENTITY_ID\n" + data.map(d => 
        `"${d.id}","${d.createdAt.toISOString()}","${d.user.email}","${d.action}","${d.entityName}","${d.entityId}"`
      ).join("\n")
    } else {
      return NextResponse.json({ success: false, message: "Invalid export type" }, { status: 400 })
    }

    const headers = new Headers()
    headers.set("Content-Type", "text/csv")
    headers.set("Content-Disposition", `attachment; filename="${filename}"`)

    return new NextResponse(csvStr, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, message: "Error generating export" }, { status: 500 })
  }
}
