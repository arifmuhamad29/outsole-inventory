import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "SUPER_ADMIN" && !session.user.permissions?.includes("CREATE_HANDOVER")) {
      return NextResponse.json({ success: false, message: "Forbidden: Anda tidak memiliki izin kelola Handover" }, { status: 403 })
    }

    const { qrCode } = await req.json()

    if (!qrCode) {
      return NextResponse.json({ success: false, message: "QR Code is required" }, { status: 400 })
    }

    const outsole = await prisma.outsole.findUnique({
      where: { qrCode: qrCode.trim() }
    })

    if (!outsole) {
      return NextResponse.json({ success: false, message: "QR Code tidak ditemukan" }, { status: 404 })
    }

    if (outsole.stock <= 0) {
      return NextResponse.json({ success: false, message: "Stok habis (0)" }, { status: 400 })
    }

    if (!outsole.isActive) {
      return NextResponse.json({ success: false, message: "Outsole tidak aktif" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: outsole.id,
        qrCode: outsole.qrCode,
        model: outsole.model,
        article: outsole.article,
        color: outsole.color,
        size: outsole.size,
        stock: outsole.stock
      }
    })

  } catch (error) {
    console.error("Scanner Handover Check Error:", error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
