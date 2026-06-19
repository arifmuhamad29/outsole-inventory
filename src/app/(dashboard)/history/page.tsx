import { Prisma } from '@prisma/client'
import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DebouncedSearch } from "@/components/ui/DebouncedSearch"
import { PaginationControls } from "@/components/ui/PaginationControls"
import { History } from "lucide-react"
import { auth } from "@/lib/auth"

// Types for Raw SQL mapping
type RawActivity = {
  id: string
  codeLast: string
  category: string
  itemName: string
  size: string
  type: string
  operator: string
  qty: number
  unit: string
  remarks: string
  createdAt: Date
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth()
  
  if (!session || (!session.user.permissions?.includes("VIEW_HISTORY") && session.user.role !== "SUPER_ADMIN")) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Akses Ditolak</h2>
        <p className="text-slate-600">Anda tidak memiliki izin untuk melihat riwayat transaksi.</p>
        <p className="text-sm text-slate-500">Hubungi Super Admin jika Anda membutuhkan akses (Permission: VIEW_HISTORY).</p>
      </div>
    )
  }

  const params = await searchParams
  const currentPage = parseInt(params.page as string) || 1
  const search = (params.search as string) || ''
  
  const limit = 25
  const skip = (currentPage - 1) * limit
  const searchPattern = `%${search}%`

  // 1. RAW SQL: Combined Query with UNION ALL and Pagination
  const dataQuery = Prisma.sql`
    WITH CombinedHistory AS (
      SELECT 
        t.id, 
        o."qrCode" as "codeLast", 
        'Outsole' as "category",
        o.model || ' (' || o.color || ')' as "itemName",
        COALESCE(o.size, '-') as "size",
        t.type::text as "type",
        u.name as "operator",
        t.qty,
        'PRS' as "unit",
        COALESCE(t.notes, '') as "remarks",
        t."createdAt"
      FROM "Transaction" t
      LEFT JOIN "Outsole" o ON t."outsoleId" = o.id
      LEFT JOIN "User" u ON t."userId" = u.id
      WHERE 
        ${search} = '' OR
        o."qrCode" ILIKE ${searchPattern} OR
        o.model ILIKE ${searchPattern} OR
        u.name ILIKE ${searchPattern} OR
        t.notes ILIKE ${searchPattern}
        
      UNION ALL
      
      SELECT 
        h.id, 
        COALESCE(h."codeLast", '-') as "codeLast", 
        COALESCE((SELECT "toolName" FROM "HandoverItem" WHERE "handoverId" = h.id LIMIT 1), 'Handover Tooling') as "category",
        COALESCE(h."modelName", COALESCE((SELECT "toolName" FROM "HandoverItem" WHERE "handoverId" = h.id LIMIT 1), 'Handover Items')) as "itemName",
        COALESCE((SELECT "size" FROM "HandoverItem" WHERE "handoverId" = h.id LIMIT 1), '-') as "size",
        'HANDOVER' as "type", 
        h.giver as "operator",
        COALESCE((SELECT SUM(qty) FROM "HandoverItem" WHERE "handoverId" = h.id), 0)::int as "qty",
        COALESCE((SELECT "satuan" FROM "HandoverItem" WHERE "handoverId" = h.id LIMIT 1), 'SET') as "unit",
        COALESCE((SELECT "remark" FROM "HandoverItem" WHERE "handoverId" = h.id LIMIT 1), '') as "remarks",
        h."createdAt"
      FROM "Handover" h
      WHERE
        ${search} = '' OR
        h."codeLast" ILIKE ${searchPattern} OR
        h.giver ILIKE ${searchPattern} OR
        EXISTS(
          SELECT 1 FROM "HandoverItem" i 
          WHERE i."handoverId" = h.id AND 
          (i."toolName" ILIKE ${searchPattern} OR i."remark" ILIKE ${searchPattern})
        )
    )
    SELECT * FROM CombinedHistory
    ORDER BY "createdAt" DESC
    LIMIT ${limit} OFFSET ${skip}
  `

  // 2. RAW SQL: Exact COUNT(*) equivalent for strict pagination mathematically
  const countQuery = Prisma.sql`
    WITH CombinedHistory AS (
      SELECT t.id
      FROM "Transaction" t
      LEFT JOIN "Outsole" o ON t."outsoleId" = o.id
      LEFT JOIN "User" u ON t."userId" = u.id
      WHERE 
        ${search} = '' OR
        o."qrCode" ILIKE ${searchPattern} OR
        o.model ILIKE ${searchPattern} OR
        u.name ILIKE ${searchPattern} OR
        t.notes ILIKE ${searchPattern}
        
      UNION ALL
      
      SELECT h.id
      FROM "Handover" h
      WHERE
        ${search} = '' OR
        h."codeLast" ILIKE ${searchPattern} OR
        h.giver ILIKE ${searchPattern} OR
        EXISTS(
          SELECT 1 FROM "HandoverItem" i 
          WHERE i."handoverId" = h.id AND 
          (i."toolName" ILIKE ${searchPattern} OR i."remark" ILIKE ${searchPattern})
        )
    )
    SELECT COUNT(*)::int as "totalCount" FROM CombinedHistory
  `

  // 3. Execute concurrently
  const [data, countResult] = await prisma.$transaction([
    prisma.$queryRaw<RawActivity[]>(dataQuery),
    prisma.$queryRaw<{ totalCount: number }[]>(countQuery)
  ])

  const recentActivity = data
  const totalCount = countResult[0]?.totalCount || 0
  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          Transaction History / Audit Log
        </h2>
        <p className="text-muted-foreground mt-1">Full chronological ledger of all stock movements across the warehouse.</p>
      </div>

      {/* SEARCH BAR */}
      <div className="w-full max-w-md">
        <DebouncedSearch />
      </div>

      {/* TABLE DATA */}
      <Card>
        <CardHeader className="py-4 border-b">
          <CardTitle className="flex justify-between items-center text-base">
            <span>Ledger Records</span>
            <span className="text-sm font-normal text-muted-foreground">Showing {recentActivity.length} of {totalCount} records</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-[180px]">QR Code / Handover ID</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Last Code</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Operator / Admin</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Date &amp; Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-32 text-muted-foreground">
                      {search ? "No records match your search." : "No history found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivity.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.category === "Outsole" ? item.codeLast : item.id}
                      </TableCell>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.category === "Outsole" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.category === "Outsole" ? <span className="text-muted-foreground">-</span> : item.codeLast}
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">{item.size}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          item.type === "INBOUND" ? "text-blue-600 dark:text-blue-400" :
                          item.type === "OUTBOUND" ? "text-orange-600 dark:text-orange-400" :
                          item.type === "HANDOVER" ? "text-purple-600 dark:text-purple-400" :
                          item.type === "ADJUSTMENT" ? "text-amber-600 dark:text-amber-400" :
                          "text-gray-600 dark:text-gray-400"
                        }`}>
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.type === "INBOUND" ? (
                          <span className="text-green-600 dark:text-green-400 font-medium text-sm">+ {item.qty} {item.unit}</span>
                        ) : item.type === "ADJUSTMENT" ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">~ {item.qty} {item.unit}</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium text-sm">- {item.qty} {item.unit}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.operator}</TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate text-sm" title={item.remarks || "No remarks"}>
                          {item.remarks ? item.remarks : <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString('en-GB', { 
                          timeZone: 'Asia/Jakarta', 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          hour12: false 
                        })} WIB
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <PaginationControls totalPages={totalPages} currentPage={currentPage} />
        </div>
      )}
    </div>
  )
}
