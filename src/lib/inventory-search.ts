import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

export interface InventoryFilterParams {
  search?: string
  model?: string
  article?: string
  color?: string
  size?: string
  poNumber?: string
  soleType?: string
  bottomTreatment?: string
  status?: string
}

/**
 * Splits query string into tokens, preserving quoted phrases as single tokens.
 * E.g. '9dj white "nb 103 white"' -> ['9dj', 'white', 'nb 103 white']
 */
export function parseSearchTokens(query: string): string[] {
  if (!query || !query.trim()) return []
  const matches = query.match(/"([^"]+)"|(\S+)/g) || []
  return matches
    .map((m) => m.replace(/^"|"$/g, "").trim())
    .filter(Boolean)
}

/**
 * Constructs a Prisma OutsoleWhereInput combining multi-token search and specific column filters.
 * All tokens and filters are joined with AND so searching "9dj white 5T" requires
 * token "9dj" AND token "white" AND token "5T" to all match in the outsole record.
 */
export function buildInventoryWhereClause(
  params: InventoryFilterParams
): Prisma.OutsoleWhereInput {
  const andConditions: Prisma.OutsoleWhereInput[] = [{ isActive: true }]

  // 1. Dedicated column filters
  if (params.model?.trim()) {
    andConditions.push({
      model: { contains: params.model.trim(), mode: "insensitive" },
    })
  }

  if (params.article?.trim()) {
    andConditions.push({
      article: { contains: params.article.trim(), mode: "insensitive" },
    })
  }

  if (params.color?.trim()) {
    andConditions.push({
      color: { contains: params.color.trim(), mode: "insensitive" },
    })
  }

  if (params.size?.trim()) {
    andConditions.push({
      size: { contains: params.size.trim(), mode: "insensitive" },
    })
  }

  if (params.poNumber?.trim()) {
    andConditions.push({
      poNumber: { contains: params.poNumber.trim(), mode: "insensitive" },
    })
  }

  if (params.soleType?.trim() && params.soleType !== "all") {
    andConditions.push({
      soleType: { contains: params.soleType.trim(), mode: "insensitive" },
    })
  }

  if (params.bottomTreatment?.trim() && params.bottomTreatment !== "all") {
    andConditions.push({
      bottomTreatment: { contains: params.bottomTreatment.trim(), mode: "insensitive" },
    })
  }

  // 2. Status filter
  if (params.status === "lowstock") {
    andConditions.push({
      stock: { lte: prisma.outsole.fields.minimumStock },
    })
  } else if (params.status === "instock") {
    andConditions.push({
      stock: { gt: prisma.outsole.fields.minimumStock },
    })
  }

  // 3. Multi-token Free-form Search
  if (params.search?.trim()) {
    const tokens = parseSearchTokens(params.search)

    for (const token of tokens) {
      // Check for key-value prefix like "article:9dj", "color:white", "size:5t"
      const colonIdx = token.indexOf(":")
      if (colonIdx > 0) {
        const key = token.slice(0, colonIdx).toLowerCase()
        const val = token.slice(colonIdx + 1).trim()
        if (val) {
          if (key === "art" || key === "article") {
            andConditions.push({ article: { contains: val, mode: "insensitive" } })
            continue
          }
          if (key === "model" || key === "mod") {
            andConditions.push({ model: { contains: val, mode: "insensitive" } })
            continue
          }
          if (key === "color" || key === "warna" || key === "col") {
            andConditions.push({ color: { contains: val, mode: "insensitive" } })
            continue
          }
          if (key === "size" || key === "ukuran" || key === "sz") {
            andConditions.push({ size: { contains: val, mode: "insensitive" } })
            continue
          }
          if (key === "po" || key === "ponumber") {
            andConditions.push({ poNumber: { contains: val, mode: "insensitive" } })
            continue
          }
          if (key === "qr" || key === "qrcode") {
            andConditions.push({ qrCode: { contains: val, mode: "insensitive" } })
            continue
          }
          if (key === "bottom" || key === "bt") {
            andConditions.push({ bottomTreatment: { contains: val, mode: "insensitive" } })
            continue
          }
          if (key === "sole" || key === "soletype") {
            andConditions.push({ soleType: { contains: val, mode: "insensitive" } })
            continue
          }
        }
      }

      // Default: match token against all key outsole fields
      andConditions.push({
        OR: [
          { model: { contains: token, mode: "insensitive" } },
          { article: { contains: token, mode: "insensitive" } },
          { qrCode: { contains: token, mode: "insensitive" } },
          { color: { contains: token, mode: "insensitive" } },
          { poNumber: { contains: token, mode: "insensitive" } },
          { size: { contains: token, mode: "insensitive" } },
          { bottomTreatment: { contains: token, mode: "insensitive" } },
          { soleType: { contains: token, mode: "insensitive" } },
          { component: { contains: token, mode: "insensitive" } },
          { notes: { contains: token, mode: "insensitive" } },
        ],
      })
    }
  }

  if (andConditions.length === 1) {
    return andConditions[0]
  }

  return { AND: andConditions }
}

