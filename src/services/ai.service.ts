import { FunctionDeclaration, SchemaType } from "@google/generative-ai"
import prisma from "@/lib/prisma"
import { buildInventoryWhereClause } from "@/lib/inventory-search"

// Tool 1: Search Outsoles
const searchOutsolesDeclaration: FunctionDeclaration = {
  name: "searchOutsoles",
  description:
    "Mencari data outsole/sol sepatu di database berdasarkan query bebas (misal: '9dj white 5t'), model, artikel, warna, ukuran, atau status stok.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "Kata kunci pencarian bebas, contoh: '9dj white', '603 white 5t', 'black 7t'.",
      },
      model: {
        type: SchemaType.STRING,
        description: "Kode model sol, contoh: '603', 'W603', 'P603'.",
      },
      article: {
        type: SchemaType.STRING,
        description: "Kode artikel sol, contoh: '9DJ', '7F0', 'SF4'.",
      },
      color: {
        type: SchemaType.STRING,
        description: "Warna sol, contoh: 'WHITE', 'SEA SALT', 'BLACK'.",
      },
      size: {
        type: SchemaType.STRING,
        description: "Ukuran sol, contoh: '5T', '8', '10T', '4K'.",
      },
      status: {
        type: SchemaType.STRING,
        description: "Filter status stok: 'instock' untuk stok cukup, 'lowstock' untuk stok menipis.",
      },
      limit: {
        type: SchemaType.NUMBER,
        description: "Jumlah data maksimal yang diambil (default 10, maksimal 25).",
      },
    },
  },
}

// Tool 2: Get Inventory Overview
const getInventoryOverviewDeclaration: FunctionDeclaration = {
  name: "getInventoryOverview",
  description:
    "Mengambil ringkasan statistik inventaris keseluruhan: total SKU, total kuantitas stok fisik, dan jumlah SKU yang berstatus low stock.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
}

// Tool 3: Get Recent Transactions
const getRecentTransactionsDeclaration: FunctionDeclaration = {
  name: "getRecentTransactions",
  description:
    "Mengambil riwayat transaksi mutasi stok terbaru (INBOUND/masuk, OUTBOUND/keluar, ADJUSTMENT/penyesuaian).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      type: {
        type: SchemaType.STRING,
        description: "Jenis transaksi: 'INBOUND', 'OUTBOUND', atau 'ADJUSTMENT'. Kosongkan untuk semua tipe.",
      },
      limit: {
        type: SchemaType.NUMBER,
        description: "Jumlah transaksi yang diambil (default 10).",
      },
    },
  },
}

// Tool 4: Search Handovers
const searchHandoversDeclaration: FunctionDeclaration = {
  name: "searchHandovers",
  description:
    "Mencari riwayat serah terima (handover) sol atau shoe last ke penerima (recipient / sample room / divisi terkait).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      recipient: {
        type: SchemaType.STRING,
        description: "Nama atau divisi penerima serah terima.",
      },
      modelName: {
        type: SchemaType.STRING,
        description: "Nama model sol atau last yang diserahterimakan.",
      },
      limit: {
        type: SchemaType.NUMBER,
        description: "Jumlah data maksimal (default 5).",
      },
    },
  },
}

// Tool 5: Search Tooling
const searchToolingDeclaration: FunctionDeclaration = {
  name: "searchTooling",
  description: "Mencari data cetakan / tooling / mould dan status ketersediaannya di sistem.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      model: {
        type: SchemaType.STRING,
        description: "Nama atau nomor model tooling.",
      },
      limit: {
        type: SchemaType.NUMBER,
        description: "Jumlah data maksimal (default 5).",
      },
    },
  },
}

// System instruction for the assistant
const SYSTEM_INSTRUCTION = `
Anda adalah "Asisten AI Gudang", asisten pintar yang bertugas membantu admin dan operator sistem Development Outsole & Tooling Inventory.
Karakter dan aturan Anda:
1. Bersikap ramah, profesional, ringkas, dan fokus pada data gudang yang akurat.
2. Gunakan Bahasa Indonesia yang baik dan mudah dipahami oleh pekerja operasional pabrik/gudang sepatu.
3. Selalu gunakan Tools yang disediakan (Function Calling) untuk memeriksa data nyata di database. JANGAN PERNAH mengarang atau memperkirakan data stok jika tidak ada di database.
4. Format angka, nama model, artikel, warna, dan ukuran dengan jelas (gunakan markdown seperti tebal **603**, ukuran **5T**, dll).
5. Jika data tidak ditemukan, sampaikan dengan sopan dan tawarkan saran pencarian lain (misal: cek ejaan artikel atau model).
6. Jika stok di bawah minimum stock (<= 5), berikan tanda peringatan kecil (misal: ⚠️ Low Stock).
`

/**
 * Execute tool calls against Prisma (strictly READ-ONLY operations)
 */
async function executeTool(name: string, args: Record<string, unknown>) {
  try {
    switch (name) {
      case "searchOutsoles": {
        let query = typeof args.query === "string" ? args.query : undefined
        if (query) {
          query = query
            .replace(
              /\b(stok|stock|sol|outsole|midsole|sepatu|warna|color|ukuran|size|berapa|ada|cari|cek)\b/gi,
              " "
            )
            .replace(/\s+/g, " ")
            .trim()
        }
        const model = typeof args.model === "string" ? args.model : undefined
        const article = typeof args.article === "string" ? args.article : undefined
        const color = typeof args.color === "string" ? args.color : undefined
        const size = typeof args.size === "string" ? args.size : undefined
        const status = typeof args.status === "string" ? args.status : undefined
        const limit = typeof args.limit === "number" ? Math.min(Math.max(1, args.limit), 25) : 15

        const where = buildInventoryWhereClause({
          search: query,
          model,
          article,
          color,
          size,
          status,
        })

        const [items, totalCount] = await Promise.all([
          prisma.outsole.findMany({
            where,
            take: limit,
            orderBy: [{ updatedAt: "desc" }],
            select: {
              id: true,
              qrCode: true,
              model: true,
              article: true,
              color: true,
              size: true,
              stock: true,
              minimumStock: true,
              poNumber: true,
              soleType: true,
              bottomTreatment: true,
              notes: true,
              updatedAt: true,
            },
          }),
          prisma.outsole.count({ where }),
        ])

        return {
          totalDitemukan: totalCount,
          menampilkan: items.length,
          hasil: items.map((i) => ({
            qrCode: i.qrCode,
            model: i.model,
            article: i.article,
            color: i.color,
            size: i.size,
            stock: i.stock,
            isLowStock: i.stock <= i.minimumStock,
            poNumber: i.poNumber || "-",
            soleType: i.soleType,
            bottomTreatment: i.bottomTreatment,
          })),
        }
      }

      case "getInventoryOverview": {
        const [totalSku, stockAgg, lowStockCount] = await Promise.all([
          prisma.outsole.count({ where: { isActive: true } }),
          prisma.outsole.aggregate({
            _sum: { stock: true },
            where: { isActive: true },
          }),
          prisma.outsole.count({
            where: {
              isActive: true,
              stock: { lte: prisma.outsole.fields.minimumStock },
            },
          }),
        ])

        return {
          totalSKU: totalSku,
          totalStockPasang: stockAgg._sum.stock || 0,
          jumlahLowStock: lowStockCount,
        }
      }

      case "getRecentTransactions": {
        const typeStr = typeof args.type === "string" ? args.type.toUpperCase() : undefined
        const limit = typeof args.limit === "number" ? Math.min(Math.max(1, args.limit), 20) : 10

        const txType =
          typeStr === "INBOUND" || typeStr === "OUTBOUND" || typeStr === "ADJUSTMENT"
            ? (typeStr as "INBOUND" | "OUTBOUND" | "ADJUSTMENT")
            : undefined

        const transactions = await prisma.transaction.findMany({
          where: txType ? { type: txType } : undefined,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            outsole: {
              select: {
                model: true,
                article: true,
                color: true,
                size: true,
                qrCode: true,
              },
            },
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })

        return transactions.map((t) => ({
          tipe: t.type,
          jumlah: t.qty,
          model: t.outsole?.model,
          article: t.outsole?.article,
          color: t.outsole?.color,
          size: t.outsole?.size,
          operator: t.user?.name || t.user?.email || "System",
          waktu: t.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
          catatan: t.notes || "-",
        }))
      }

      case "searchHandovers": {
        const recipient = typeof args.recipient === "string" ? args.recipient : undefined
        const modelName = typeof args.modelName === "string" ? args.modelName : undefined
        const limit = typeof args.limit === "number" ? Math.min(Math.max(1, args.limit), 10) : 5

        const handovers = await prisma.handover.findMany({
          where: {
            AND: [
              recipient ? { recipient: { contains: recipient, mode: "insensitive" } } : {},
              modelName ? { modelName: { contains: modelName, mode: "insensitive" } } : {},
            ],
          },
          take: limit,
          orderBy: { date: "desc" },
          select: {
            id: true,
            modelName: true,
            codeLast: true,
            recipient: true,
            giver: true,
            date: true,
          },
        })

        return handovers.map((h) => ({
          model: h.modelName,
          codeLast: h.codeLast,
          penerima: h.recipient,
          pemberi: h.giver,
          tanggal: h.date.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
        }))
      }

      case "searchTooling": {
        const model = typeof args.model === "string" ? args.model : undefined
        const limit = typeof args.limit === "number" ? Math.min(Math.max(1, args.limit), 10) : 5

        const toolings = await prisma.toolingItem.findMany({
          where: model ? { model: { name: { contains: model, mode: "insensitive" } } } : undefined,
          take: limit,
          select: {
            id: true,
            category: true,
            name: true,
            remark: true,
            model: {
              select: { name: true },
            },
          },
        })

        return toolings.map((t) => ({
          model: t.model?.name,
          kategori: t.category,
          nama: t.name,
          catatan: t.remark || "-",
        }))
      }

      default:
        return { error: `Fungsi '${name}' tidak dikenali.` }
    }
  } catch (error) {
    console.error(`Error executing AI tool ${name}:`, error)
    return { error: error instanceof Error ? error.message : "Gagal mengeksekusi kueri data." }
  }
}

export interface ChatMessage {
  role: "user" | "model"
  parts: { text: string }[]
}

export interface AvailableGeminiModel {
  id: string
  name: string
  displayName: string
  description?: string
}

/**
 * Reads the centralized AI configuration from the database SystemSetting table.
 * Falls back to process.env.GEMINI_API_KEY if not configured in DB.
 */
export async function getAiSystemConfig(): Promise<{ apiKey: string; model: string }> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ["GEMINI_API_KEY", "GEMINI_MODEL"] },
      },
    })
    const map = new Map(settings.map((s) => [s.key, s.value]))
    const dbKey = (map.get("GEMINI_API_KEY") || "").trim()
    const dbModel = (map.get("GEMINI_MODEL") || "").trim()

    const apiKey = dbKey || (process.env.GEMINI_API_KEY || "").trim()
    const model = dbModel || "gemini-2.0-flash"

    return { apiKey, model }
  } catch (err) {
    console.error("Error reading AI system config from DB:", err)
    return {
      apiKey: (process.env.GEMINI_API_KEY || "").trim(),
      model: "gemini-2.0-flash",
    }
  }
}

/**
 * Returns public/safe status of the AI configuration for users.
 */
export async function getAiSystemConfigStatus(): Promise<{
  isConfigured: boolean
  activeModel: string
  maskedKey: string | null
}> {
  const { apiKey, model } = await getAiSystemConfig()
  const isConfigured = Boolean(apiKey && apiKey.length > 5)
  let maskedKey: string | null = null
  if (apiKey && apiKey.length > 8) {
    maskedKey = `${apiKey.substring(0, 6)}••••••••${apiKey.substring(apiKey.length - 4)}`
  } else if (apiKey) {
    maskedKey = "••••••••"
  }
  return {
    isConfigured,
    activeModel: model,
    maskedKey,
  }
}

/**
 * Saves the AI API key and selected model into the central database.
 * Only SUPER_ADMIN can invoke this via the API route.
 */
export async function saveAiSystemConfig(
  apiKey?: string,
  model?: string
): Promise<{ success: boolean; model: string; hasKey: boolean }> {
  if (apiKey && apiKey.trim()) {
    await prisma.systemSetting.upsert({
      where: { key: "GEMINI_API_KEY" },
      update: { value: apiKey.trim() },
      create: { key: "GEMINI_API_KEY", value: apiKey.trim() },
    })
  }

  if (model && model.trim()) {
    const cleanModel = model.trim().replace(/^models\//, "")
    await prisma.systemSetting.upsert({
      where: { key: "GEMINI_MODEL" },
      update: { value: cleanModel },
      create: { key: "GEMINI_MODEL", value: cleanModel },
    })
  }

  const current = await getAiSystemConfig()
  return {
    success: true,
    model: current.model,
    hasKey: Boolean(current.apiKey),
  }
}

/**
 * Fetches all available generative models for a given Google Gemini API Key.
 * Validates the key and filters for models supporting text/content generation.
 * If apiKeyOverride is not provided, uses the saved key from the database.
 */
export async function fetchAvailableGeminiModels(
  apiKeyOverride?: string
): Promise<AvailableGeminiModel[]> {
  let apiKey = (apiKeyOverride || "").trim()

  if (!apiKey) {
    const sysConfig = await getAiSystemConfig()
    apiKey = sysConfig.apiKey
  }

  if (!apiKey) {
    throw new Error(
      "API Key tidak boleh kosong. Silakan masukkan Kunci API Gemini Anda."
    )
  }

  const cleanKey = apiKey.trim()
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`

  const res = await fetch(url)
  const data = await res.json()

  if (!res.ok || data.error) {
    const errorMsg =
      data.error?.message ||
      `Kunci API tidak valid atau gagal terhubung ke Google AI Studio (Status: ${res.status}).`
    throw new Error(errorMsg)
  }

  const rawModels: {
    name?: string
    displayName?: string
    description?: string
    supportedGenerationMethods?: string[]
  }[] = data.models || []

  // Filter models that support generateContent
  const validModels: AvailableGeminiModel[] = rawModels
    .filter((m) =>
      Array.isArray(m.supportedGenerationMethods) &&
      m.supportedGenerationMethods.includes("generateContent")
    )
    .map((m) => {
      const rawName = m.name || ""
      const id = rawName.replace(/^models\//, "")
      return {
        id,
        name: rawName,
        displayName: m.displayName || id,
        description: m.description,
      }
    })

  // Prioritize modern flash models on top
  validModels.sort((a, b) => {
    if (a.id.includes("2.0-flash") && !b.id.includes("2.0-flash")) return -1
    if (!a.id.includes("2.0-flash") && b.id.includes("2.0-flash")) return 1
    if (a.id.includes("1.5-flash") && !b.id.includes("1.5-flash")) return -1
    if (!a.id.includes("1.5-flash") && b.id.includes("1.5-flash")) return 1
    return a.id.localeCompare(b.id)
  })

  return validModels
}

interface GeminiContentPart {
  text?: string
  functionCall?: {
    name: string
    args: Record<string, unknown>
  }
  functionResponse?: {
    name: string
    response: {
      result: unknown
    }
  }
}

interface GeminiContent {
  role: "user" | "model"
  parts: GeminiContentPart[]
}

/**
 * Process a chat message with Google Gemini, resolving any Function Calling tools automatically.
 * Uses direct REST API call so functionResponse uses role: "user", avoiding the SDK bug
 * "[400 Bad Request] Role 'function' is not supported".
 * Automatically falls back to centralized database settings configured by the Super Administrator.
 */
export async function processAiInventoryChat(
  message: string,
  history: ChatMessage[] = [],
  apiKeyOverride?: string,
  modelNameOverride?: string
): Promise<{ reply: string; toolsUsed: string[]; modelUsed: string }> {
  let apiKey = (apiKeyOverride || "").trim()
  let chosenModel = (modelNameOverride || "").trim()

  // Retrieve central configuration from database if not explicitly overridden
  if (!apiKey || !chosenModel) {
    const sysConfig = await getAiSystemConfig()
    if (!apiKey) {
      apiKey = sysConfig.apiKey
    }
    if (!chosenModel) {
      chosenModel = sysConfig.model
    }
  }

  if (!apiKey) {
    throw new Error(
      "Layanan AI belum dikonfigurasi oleh Administrator. Silakan hubungi Super Administrator untuk memasukkan Kunci API AI pada sistem."
    )
  }

  // Sanitize model name (remove any "models/" prefix)
  chosenModel = (chosenModel || "gemini-2.0-flash").replace(
    /^models\//,
    ""
  )

  const toolsPayload = [
    {
      functionDeclarations: [
        searchOutsolesDeclaration,
        getInventoryOverviewDeclaration,
        getRecentTransactionsDeclaration,
        searchHandoversDeclaration,
        searchToolingDeclaration,
      ],
    },
  ]

  // Construct conversation contents
  const contents: GeminiContent[] = []

  // Add history (last 6 messages)
  for (const h of history.slice(-6)) {
    if (h.parts && Array.isArray(h.parts) && h.parts.length > 0) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: h.parts.map((p) => ({ text: p.text })),
      })
    }
  }

  // Add new user prompt
  contents.push({
    role: "user",
    parts: [{ text: message }],
  })

  const toolsUsed: string[] = []
  const maxIterations = 5
  let iterations = 0
  let finalReply = ""

  while (iterations < maxIterations) {
    iterations++

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${apiKey}`

    const requestBody = {
      contents,
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      tools: toolsPayload,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      const errorMsg = data.error?.message || `Google API error (Status: ${res.status})`
      throw new Error(errorMsg)
    }

    const candidate = data.candidates?.[0]
    if (!candidate || !candidate.content) {
      finalReply = "Maaf, tidak ada tanggapan dari model AI."
      break
    }

    const candidateParts: GeminiContentPart[] =
      (candidate.content.parts as GeminiContentPart[]) || []

    // Check if the model requested function calls
    const functionCalls = candidateParts.filter(
      (
        p
      ): p is GeminiContentPart & {
        functionCall: { name: string; args: Record<string, unknown> }
      } => Boolean(p.functionCall && p.functionCall.name)
    )

    if (functionCalls.length === 0) {
      // Model responded with text directly
      const textParts = candidateParts
        .map((p) => p.text)
        .filter((t): t is string => typeof t === "string" && t.length > 0)
        .join("\n")

      finalReply = textParts || "Maaf, respon kosong dari model."
      break
    }

    // Function calls were requested:
    // 1. Add model's functionCall turn to contents
    contents.push(candidate.content)

    // 2. Execute all function calls
    const responseParts: GeminiContentPart[] = []

    for (const callPart of functionCalls) {
      const call = callPart.functionCall
      toolsUsed.push(call.name)
      const result = await executeTool(call.name, (call.args as Record<string, unknown>) || {})
      responseParts.push({
        functionResponse: {
          name: call.name,
          response: { result },
        },
      })
    }

    // 3. Add function responses to contents with role "user" (NOT "function"!)
    contents.push({
      role: "user",
      parts: responseParts,
    })

    // Loop continues to let Gemini read the result and answer or call another tool
  }

  return {
    reply: finalReply || "Maaf, saya tidak dapat merespons saat ini.",
    toolsUsed: Array.from(new Set(toolsUsed)),
    modelUsed: chosenModel,
  }
}

