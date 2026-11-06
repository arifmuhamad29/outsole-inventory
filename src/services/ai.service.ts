import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from "@google/generative-ai"
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
        const query = typeof args.query === "string" ? args.query : undefined
        const model = typeof args.model === "string" ? args.model : undefined
        const article = typeof args.article === "string" ? args.article : undefined
        const color = typeof args.color === "string" ? args.color : undefined
        const size = typeof args.size === "string" ? args.size : undefined
        const status = typeof args.status === "string" ? args.status : undefined
        const limit = typeof args.limit === "number" ? Math.min(Math.max(1, args.limit), 25) : 10

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
 * Fetches all available generative models for a given Google Gemini API Key.
 * Validates the key and filters for models supporting text/content generation.
 */
export async function fetchAvailableGeminiModels(
  apiKeyOverride?: string
): Promise<AvailableGeminiModel[]> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY

  if (!apiKey || apiKey.trim() === "") {
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

/**
 * Process a chat message with Google Gemini, resolving any Function Calling tools automatically.
 */
export async function processAiInventoryChat(
  message: string,
  history: ChatMessage[] = [],
  apiKeyOverride?: string,
  modelNameOverride?: string
): Promise<{ reply: string; toolsUsed: string[]; modelUsed: string }> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY

  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "GEMINI_API_KEY belum dikonfigurasi. Silakan masukkan Kunci API Anda terlebih dahulu di pengaturan asisten AI."
    )
  }

  // Sanitize model name (remove any "models/" prefix)
  const chosenModel = (modelNameOverride?.trim() || "gemini-2.0-flash").replace(
    /^models\//,
    ""
  )

  const genAI = new GoogleGenerativeAI(apiKey.trim())
  const model = genAI.getGenerativeModel({
    model: chosenModel,
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [
      {
        functionDeclarations: [
          searchOutsolesDeclaration,
          getInventoryOverviewDeclaration,
          getRecentTransactionsDeclaration,
          searchHandoversDeclaration,
          searchToolingDeclaration,
        ],
      },
    ],
  })

  // Start chat session with past history
  const chat = model.startChat({
    history: history.slice(-8), // Keep last 8 turns for context window efficiency
  })

  const toolsUsed: string[] = []

  // Send initial message
  let response = await chat.sendMessage(message)

  // Loop through function calls if Gemini requests them (supports multi-turn tool calling)
  let functionCalls = response.response.functionCalls()
  let iterations = 0
  const maxIterations = 5

  while (functionCalls && functionCalls.length > 0 && iterations < maxIterations) {
    iterations++
    const functionResponses = []

    for (const call of functionCalls) {
      toolsUsed.push(call.name)
      const result = await executeTool(call.name, call.args as Record<string, unknown>)
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { result },
        },
      })
    }

    // Send tool execution results back to Gemini
    response = await chat.sendMessage(functionResponses)
    functionCalls = response.response.functionCalls()
  }

  const replyText = response.response.text() || "Maaf, saya tidak dapat merespons saat ini."

  return {
    reply: replyText,
    toolsUsed: Array.from(new Set(toolsUsed)),
    modelUsed: chosenModel,
  }
}

