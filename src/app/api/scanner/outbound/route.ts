import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { outboundSchema } from "@/schemas/inventory"
import { InventoryService } from "@/services/inventory.service"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "SUPER_ADMIN" && !session.user.permissions?.includes("MANAGE_OUTBOUND")) {
      return NextResponse.json({ success: false, message: "Forbidden: Anda tidak memiliki izin Kelola Outbound" }, { status: 403 })
    }
    const body = await req.json()
    const parsed = outboundSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid input data", 
        errors: parsed.error.flatten().fieldErrors 
      }, { status: 400 })
    }

    const result = await InventoryService.processOutbound(parsed.data, session.user.id)
    
    return NextResponse.json({
      success: true,
      message: "Outbound successful",
      data: result
    })
    
  } catch (error) {
    console.error("Scanner API Error:", error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
