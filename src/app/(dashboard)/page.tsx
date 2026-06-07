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

export default async function DashboardPage() {
  // Define time range for today's handovers
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  // 1. Fetch Aggregations (Parallel)
  const [
    outsoleCount,
    toolingCount,
    bpmCount,
    outsoleLowStock,
    bpmLowStock,
    todayHandovers,
    recentInbound,
    recentTransactionsRaw,
    recentHandoversRaw
  ] = await Promise.all([
    // Total SKUs breakdown
    prisma.outsole.count({ where: { isActive: true } }),
    prisma.toolingItem.count(),
    prisma.bpmTfmStock.count(),
    
    // Low Stock Counts (< 2)
    prisma.outsole.count({ where: { isActive: true, stock: { lt: 2 } } }),
    prisma.bpmTfmStock.count({ where: { devStock: { lt: 2 } } }),
    
    // Today's Handovers
    prisma.handover.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    }),

    // Recent Inbound Transactions
    prisma.transaction.count({
      where: { type: 'INBOUND' }
    }),

    // Recent Transactions
    prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        outsole: { select: { qrCode: true, model: true, color: true } }
      }
    }),

    // Recent Handovers
    prisma.handover.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { take: 1, select: { toolName: true } }
      }
    })
  ])

  const totalSkus = outsoleCount + toolingCount + bpmCount
  const lowStockCount = outsoleLowStock + bpmLowStock

  // Format Recent Activity
  const mappedTransactions = recentTransactionsRaw.map(t => ({
    id: t.id,
    codeLast: t.outsole.qrCode,
    category: "Outsole",
    itemName: `${t.outsole.model} (${t.outsole.color})`,
    type: t.type,
    operator: t.user.name,
    createdAt: t.createdAt
  }))

  const mappedHandovers = recentHandoversRaw.map(h => ({
    id: h.id,
    codeLast: h.codeLast || "-",
    category: "BPM/TFM",
    itemName: h.modelName || h.items[0]?.toolName || "Handover Items",
    type: "HANDOVER",
    operator: h.giver,
    createdAt: h.createdAt
  }))

  // Combine, sort by date descending, and take top 10
  const recentActivity = [...mappedTransactions, ...mappedHandovers]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)

  return (
    <div className="space-y-8 pb-8">
      {/* HEADER / GREETING */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">👋 Hello Bottom Team, welcome back!</h2>
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
        <Card className="col-span-1 md:col-span-4">
          <CardHeader>
            <CardTitle>Handover Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <HandoverLineChart />
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
                  <TableHead className="w-[160px]">QR Code / Last Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Operator / Admin</TableHead>
                  <TableHead className="text-right">Date &amp; Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      No recent activity found.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivity.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.codeLast}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.category === "Outsole" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">{item.operator}</TableCell>
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
