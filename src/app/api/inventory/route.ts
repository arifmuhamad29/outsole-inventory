import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { buildInventoryWhereClause } from "@/lib/inventory-search"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query") || searchParams.get("search") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    const where = buildInventoryWhereClause({
      search: query,
      model: searchParams.get("model") || undefined,
      article: searchParams.get("article") || undefined,
      color: searchParams.get("color") || undefined,
      size: searchParams.get("size") || undefined,
      status: searchParams.get("status") || undefined,
    })

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
