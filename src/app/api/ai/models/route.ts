import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchAvailableGeminiModels } from "@/services/ai.service"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      )
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak: Hanya SUPER_ADMIN yang memiliki izin untuk mengatur API Key dan model AI.",
        },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const apiKey = typeof body.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : undefined

    const models = await fetchAvailableGeminiModels(apiKey)

    return NextResponse.json({
      success: true,
      models,
    })
  } catch (error) {
    console.error("Fetch Gemini Models API Error:", error)
    const errorMsg =
      error instanceof Error ? error.message : "Gagal mengambil daftar model Gemini."
    return NextResponse.json(
      {
        success: false,
        message: errorMsg,
      },
      { status: 400 }
    )
  }
}

