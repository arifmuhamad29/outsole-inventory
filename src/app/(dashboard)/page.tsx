export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertCircle, ArrowDownUp, Hash } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HandoverLineChart, InventoryDistributionPieChart } from "@/components/dashboard/dashboard-charts"
import { DashboardFilter } from "@/components/dashboard/dashboard-filter"

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function DashboardPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams
  const fromParam = typeof searchParams.from === 'string' ? searchParams.from : undefined
  const toParam = typeof searchParams.to === 'string' ? searchParams.to : undefined
  
  let chartEnd = toParam ? new Date(toParam) : new Date()
  if (isNaN(chartEnd.getTime())) chartEnd = new Date()
  chartEnd.setHours(23, 59, 59, 999)
  
  let chartStart = fromParam ? new Date(fromParam) : new Date(chartEnd)
  if (isNaN(chartStart.getTime())) chartStart = new Date(chartEnd)
  if (!fromParam || isNaN(new Date(fromParam).getTime())) {
    chartStart.setDate(chartStart.getDate() - 6) // Default 7 days
  }
  chartStart.setHours(0, 0, 0, 0)

  // Define time range for today's handovers
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  // Fetch Aggregations sequentially to prevent connection pool exhaustion on Supabase
  const outsoleCount = await prisma.outsole.count({ where: { isActive: true } })
  const toolingCount = await prisma.toolingItem.count()
  const bpmCount = await prisma.bpmTfmStock.count()
  const outsoleLowStock = await prisma.outsole.count({ where: { isActive: true, stock: { lt: 2 } } })
  const bpmLowStock = await prisma.bpmTfmStock.count({ where: { devStock: { lt: 2 } } })
  
  const todayHandovers = await prisma.handover.count({
    where: {
      date: {
        gte: startOfToday,
        lte: endOfToday
      }
    }
  })

  const recentInbound = await prisma.transaction.count({
    where: { type: 'INBOUND' }
  })

  const recentTransactionsRaw = await prisma.transaction.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
      outsole: { select: { qrCode: true, model: true, article: true, color: true, size: true } }
    }
  })

  const recentHandoversRaw = await prisma.handover.findMany({
    take: 20,
    orderBy: { date: 'desc' },
    include: {
      items: { take: 1, select: { toolName: true, qty: true, satuan: true, remark: true, size: true } }
    }
  })
  
  const last7DaysHandovers = await prisma.handover.findMany({
    where: {
      date: {
        gte: chartStart,
        lte: chartEnd
      }
    },
    include: {
      items: { select: { toolName: true, qty: true, size: true, type: true } }
    }
  })

  const totalSkus = outsoleCount + toolingCount + bpmCount
  const lowStockCount = outsoleLowStock + bpmLowStock

  // Format Recent Activity
  const mappedTransactions = recentTransactionsRaw.map(t => ({
    id: t.id,
    codeLast: t.outsole.qrCode,
    category: "Outsole",
    itemName: `${t.outsole.model}${t.outsole.article ? ` - ${t.outsole.article}` : ""} (${t.outsole.color})`,
    size: t.outsole.size || "-",
    type: t.type,
    operator: t.user.name,
    qty: t.qty,
    unit: 'PRS', // Outsoles usually pairs
    remarks: t.notes || "",
    createdAt: t.createdAt
  }))

  const mappedHandovers = recentHandoversRaw.map(h => ({
    id: h.id,
    codeLast: h.codeLast || "-",
    category: h.items[0]?.toolName || "Handover Tooling",
    itemName: h.modelName || h.items[0]?.toolName || "Handover Items",
    size: h.items[0]?.size || "-",
    type: "HANDOVER",
    operator: h.giver,
    qty: h.items.reduce((sum, item) => sum + (item.qty || 0), 0),
    unit: h.items[0]?.satuan || 'SET',
    remarks: h.items[0]?.remark || "",
    createdAt: h.date
  }))

  // Combine, sort by date descending, and take top 20
  const recentActivity = [...mappedTransactions, ...mappedHandovers]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20)

  // Generate chart data based on range
  const diffTime = Math.abs(chartEnd.getTime() - chartStart.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Include both start and end days
  const chartLength = Math.min(diffDays, 31) // Cap at 31 days to avoid UI overlap

  const chartData = Array.from({ length: chartLength }).map((_, i) => {
    const d = new Date(chartStart)
    d.setDate(d.getDate() + i)
    return {
      dateObj: d,
      name: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
      fullDate: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
      tooling: 0,
      outsole: 0,
      stages: {} as Record<string, number>
    }
  })

  let totalOutsoleDocs = 0
  let totalOutsoleArticles = 0
  let totalToolingDocs = 0
  const totalStages: Record<string, number> = {}

  interface DuplicateArticleInfo {
    article: string
    model: string
    count: number
    totalPairs: number
    dates: string[]
    docIds: string[]
  }

  const articleOccurrences = new Map<string, DuplicateArticleInfo>()

  last7DaysHandovers.forEach(h => {
    const day = chartData.find(d => d.dateObj.toDateString() === h.date.toDateString())
    if (day) {
      if (h.modelName === "Outsole Handover") {
        day.outsole += 1
        const formattedDate = h.date.toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })

        h.items.forEach(item => {
          const match = item.size?.match(/Stage:\s*(.+)$/)
          const stage = match ? match[1].trim() : "Unknown"
          day.stages[stage] = (day.stages[stage] || 0) + 1 // count as 1 article

          // Track article occurrence for summary report notes
          let model = ""
          let article = ""
          if (item.type) {
            const typeMatch = item.type.match(/^(.*?)\s*-\s*([^\s(]+)(?:\s*\((.*)\))?/)
            if (typeMatch) {
              model = typeMatch[1]?.trim() || ""
              article = typeMatch[2]?.trim() || ""
            } else {
              article = item.type.trim()
            }
          }

          if (article) {
            const key = article.toUpperCase()
            const existing = articleOccurrences.get(key)
            if (!existing) {
              articleOccurrences.set(key, {
                article,
                model,
                count: 1,
                totalPairs: item.qty || 0,
                dates: [formattedDate],
                docIds: [h.id]
              })
            } else {
              existing.count += 1
              existing.totalPairs += (item.qty || 0)
              if (!existing.dates.includes(formattedDate)) {
                existing.dates.push(formattedDate)
              }
              if (!existing.docIds.includes(h.id)) {
                existing.docIds.push(h.id)
              }
            }
          }
        })
      } else {
        day.tooling += 1
      }
    }
  })

  // Calculate totals
  chartData.forEach(d => {
    totalOutsoleDocs += d.outsole
    totalToolingDocs += d.tooling
    Object.entries(d.stages).forEach(([stage, qty]) => {
      totalOutsoleArticles += qty
      totalStages[stage] = (totalStages[stage] || 0) + qty
    })
  })

  // Format stage summary
  const stageSummaryText = Object.entries(totalStages)
    .sort((a, b) => b[1] - a[1]) // Sort by quantity descending
    .map(([stage, count]) => `**${count} article** untuk ${stage}`)
    .join(', ')

  // Duplicate / repeated articles in the filtered date range
  const duplicateArticles = Array.from(articleOccurrences.values())
    .filter(a => a.count > 1)
    .sort((a, b) => b.count - a.count || b.totalPairs - a.totalPairs)

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER / GREETING */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">👋 Hello PWI 5 Bottom Team, welcome back!</h2>
        <p className="text-muted-foreground mt-1">Here is your warehouse activity summary for today.</p>
      </div>
      
      {/* QUICK METRICS CARDS (Grid 4 cols) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active SKUs</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSkus}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${lowStockCount > 0 ? "text-red-600 dark:text-red-400" : ""}`}>Low Stock Alerts</CardTitle>
            <AlertCircle className={`h-4 w-4 ${lowStockCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-600 dark:text-red-400" : ""}`}>{lowStockCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Handovers</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayHandovers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inbound Trx</CardTitle>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentInbound}</div>
          </CardContent>
        </Card>
      </div>

      {/* VISUAL ANALYTICS AREA (Grid 7 cols) */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-1 md:col-span-4 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Handover Activity</CardTitle>
            <DashboardFilter />
          </CardHeader>
          <CardContent className="pt-4 flex flex-col h-full">
            {(fromParam || toParam) && (
              <div className="mb-4 text-sm bg-blue-50/50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3.5 rounded-lg border border-blue-100 dark:border-blue-800 space-y-2">
                <div>
                  <span className="font-semibold">Summary ({chartStart.toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })} - {chartEnd.toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })}):</span> 
                  {' '}Total <strong>{totalOutsoleDocs} dokumen</strong> Outsole ({totalOutsoleArticles} article) dan <strong>{totalToolingDocs} dokumen</strong> Tooling telah diserahterimakan.
                </div>
                {totalOutsoleArticles > 0 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    <span className="font-medium">Rincian Outsole: </span> 
                    <span dangerouslySetInnerHTML={{ __html: stageSummaryText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />.
                  </div>
                )}
                {duplicateArticles.length > 0 ? (
                  <div className="mt-2.5 pt-2.5 border-t border-blue-200/70 dark:border-blue-800/70 text-xs space-y-2">
                    <div className="flex items-start gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span>Notes Artikel Berulang: </span>
                        <span className="font-normal text-slate-700 dark:text-slate-300">
                          Dalam rentang {diffDays} hari ini, terdapat <strong className="font-bold text-amber-900 dark:text-amber-200">{duplicateArticles.length} article yang sama</strong> diserahterimakan berulang (muncul lebih dari 1 kali):
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-0.5 pl-5">
                      {duplicateArticles.map((item) => (
                        <div
                          key={item.article}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-200 text-xs shadow-sm"
                        >
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-100">{item.article}</span>
                          {item.model && (
                            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">({item.model})</span>
                          )}
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-200/80 dark:bg-amber-800/60 text-amber-950 dark:text-amber-100">
                            {item.count}x serah terima
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">
                            • {item.dates.length > 1 ? `muncul di ${item.dates.length} hari (${item.dates.join(', ')})` : `pada ${item.dates[0]}`} • Total: {item.totalPairs} PRS
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  totalOutsoleArticles > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/50 text-xs text-blue-600 dark:text-blue-400">
                      <span className="font-medium">Notes: </span> Seluruh {totalOutsoleArticles} article yang diserahterimakan dalam rentang ini berbeda (tidak ada article yang sama/berulang).
                    </div>
                  )
                )}
              </div>
            )}
            <HandoverLineChart data={chartData} />
          </CardContent>
        </Card>
        
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>Inventory Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex justify-center">
            <InventoryDistributionPieChart 
              outsoleCount={outsoleCount} 
              toolingCount={toolingCount} 
              bpmCount={bpmCount} 
            />
          </CardContent>
        </Card>
      </div>

      {/* REAL-TIME ACTIVITY FEED AREA (Full width) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🕒 Real-time Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">QR Code / Handover ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Last Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>QTY</TableHead>
                  <TableHead>Operator / Admin</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Date &amp; Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                      No recent activity found.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivity.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.category === "Outsole" ? item.codeLast : item.id}
                      </TableCell>
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
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-slate-600 font-medium">{item.size}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          item.type === "INBOUND" ? "text-blue-600 dark:text-blue-400" :
                          item.type === "OUTBOUND" ? "text-orange-600 dark:text-orange-400" :
                          item.type === "HANDOVER" ? "text-purple-600 dark:text-purple-400" :
                          "text-gray-600 dark:text-gray-400"
                        }`}>
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.type === "INBOUND" ? (
                          <span className="text-green-600 dark:text-green-400 font-medium text-sm">+ {item.qty} {item.unit}</span>
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
    </div>
  )
}
