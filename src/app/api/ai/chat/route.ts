import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { processAiInventoryChat, ChatMessage } from "@/services/ai.service"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { message, history, customApiKey, selectedModel } = body

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Pesan tidak boleh kosong." },
        { status: 400 }
      )
    }

    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : []

    const result = await processAiInventoryChat(
      message.trim(),
      chatHistory,
      typeof customApiKey === "string" && customApiKey.trim() ? customApiKey.trim() : undefined,
      typeof selectedModel === "string" && selectedModel.trim() ? selectedModel.trim() : undefined
    )

    return NextResponse.json({
      success: true,
      reply: result.reply,
      toolsUsed: result.toolsUsed,
      modelUsed: result.modelUsed,
    })
  } catch (error) {
    console.error("AI Chat API Error:", error)
    const errorMsg =
      error instanceof Error ? error.message : "Terjadi kesalahan internal pada layanan AI."
    return NextResponse.json(
      {
        success: false,
        message: errorMsg,
      },
      { status: 500 }
    )
  }
}

