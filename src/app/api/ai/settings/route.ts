import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getAiSystemConfigStatus,
  saveAiSystemConfig,
  fetchAvailableGeminiModels,
} from "@/services/ai.service"

// GET: Check AI configuration status and active model
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      )
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN"
    const status = await getAiSystemConfigStatus()

    return NextResponse.json({
      success: true,
      isConfigured: status.isConfigured,
      activeModel: status.activeModel,
      isSuperAdmin,
      maskedKey: isSuperAdmin ? status.maskedKey : null,
    })
  } catch (error) {
    console.error("AI Settings GET Error:", error)
    return NextResponse.json(
      { success: false, message: "Gagal mengambil status konfigurasi AI." },
      { status: 500 }
    )
  }
}

// POST: Save AI configuration (Only SUPER_ADMIN)
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
          message:
            "Akses ditolak: Hanya Super Administrator yang memiliki wewenang untuk mengatur Kunci API dan Model AI.",
        },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const apiKey = typeof body.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : undefined
    const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : undefined

    if (apiKey) {
      // Validate key by fetching models
      try {
        await fetchAvailableGeminiModels(apiKey)
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Kunci API tidak valid atau tidak dapat terhubung ke Google AI Studio."
        return NextResponse.json(
          { success: false, message: errorMsg },
          { status: 400 }
        )
      }
    }

    const saveResult = await saveAiSystemConfig(apiKey, model)

    return NextResponse.json({
      success: true,
      message:
        "Kunci API dan Model AI berhasil disimpan di sistem! Seluruh pengguna sekarang dapat menggunakan Asisten AI.",
      model: saveResult.model,
      isConfigured: saveResult.hasKey,
    })
  } catch (error) {
    console.error("AI Settings POST Error:", error)
    const errorMsg =
      error instanceof Error ? error.message : "Gagal menyimpan konfigurasi AI."
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    )
  }
}

