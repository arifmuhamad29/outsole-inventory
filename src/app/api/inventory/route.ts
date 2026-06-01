import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    const where = {
      isActive: true,
      OR: query ? [
        { model: { contains: query, mode: "insensitive" as const } },
        { color: { contains: query, mode: "insensitive" as const } },
        { qrCode: { contains: query, mode: "insensitive" as const } }
      ] : undefined
    }

    const [outsoles, total] = await Promise.all([
      prisma.outsole.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" }
      }),
      prisma.outsole.count({ where })
    ])

    return NextResponse.json({
      success: true,
      message: "Success",
      data: {
        outsoles,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error("Inventory GET Error:", error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
