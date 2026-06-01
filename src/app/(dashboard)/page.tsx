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
import { DashboardSearch } from "@/components/features/dashboard-search"
import { DashboardActions } from "@/components/features/dashboard-actions"

export default async function DashboardPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const whereClause = {
    isActive: true,
    ...(query ? {
      OR: [
        { model: { contains: query, mode: "insensitive" as const } },
        { article: { contains: query, mode: "insensitive" as const } },
        { qrCode: { contains: query, mode: "insensitive" as const } },
        { color: { contains: query, mode: "insensitive" as const } }
      ]
    } : {})
  }

  const [totalSku, outsoles, lowStockCount, recentTransactions] = await Promise.all([
    prisma.outsole.count({ where: { isActive: true } }),
    prisma.outsole.findMany({
      where: whereClause,
      include: { 
        transactions: { 
          where: { type: 'OUTBOUND' }, 
          orderBy: { createdAt: 'desc' }, 
          take: 1 
        } 
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    }),
    prisma.outsole.count({
      where: {
        isActive: true,
        stock: { lte: prisma.outsole.fields.minimumStock }
      }
    }),
    prisma.transaction.count()
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
          <h2 className="text-xl font-semibold tracking-tight">Recent Inventory</h2>
          <DashboardSearch />
        </div>
        <div className="rounded-md border bg-white dark:bg-gray-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>QR Code</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Last Outbound</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outsoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                    No inventory found.
                  </TableCell>
                </TableRow>
              ) : (
                outsoles.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.qrCode}</TableCell>
                    <TableCell>{item.model}</TableCell>
                    <TableCell>{item.article}</TableCell>
                    <TableCell>{item.color}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>
                      {item.transactions && item.transactions.length > 0
                        ? format(new Date(item.transactions[0].createdAt), "dd MMM yyyy, HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.stock}</TableCell>
                    <TableCell>
                      {item.stock <= item.minimumStock ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DashboardActions item={item} isAdmin={isAdmin} />
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
