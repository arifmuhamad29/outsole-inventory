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
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth()

  const [totalSku, lowStockCount, recentTransactions, latestActivity] = await Promise.all([
    prisma.outsole.count({ where: { isActive: true } }),
    prisma.outsole.count({
      where: {
        isActive: true,
        stock: { lte: prisma.outsole.fields.minimumStock }
      }
    }),
    prisma.transaction.count(),
    prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        outsole: true,
      }
    })
  ])

  const stockAgg = await prisma.outsole.aggregate({
    _sum: { stock: true },
    where: { isActive: true }
  })
  
  const realTotalStock = stockAgg._sum.stock || 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSku}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTotalStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentTransactions}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
        </div>
        <div className="rounded-md border bg-white dark:bg-gray-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Model/Color</TableHead>
                <TableHead className="text-right">Qty Changed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestActivity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No recent activity found.
                  </TableCell>
                </TableRow>
              ) : (
                latestActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(activity.createdAt), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={
                          activity.type === 'INBOUND' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                          activity.type === 'OUTBOUND' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
                        }
                      >
                        {activity.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{activity.outsole.qrCode}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{activity.outsole.model}</span>
                        <span className="text-xs text-muted-foreground">{activity.outsole.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={
                        activity.type === 'INBOUND' ? 'text-blue-600' :
                        activity.type === 'OUTBOUND' ? 'text-orange-600' :
                        'text-purple-600'
                      }>
                        {activity.type === 'OUTBOUND' ? '-' : '+'}{activity.qty}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
