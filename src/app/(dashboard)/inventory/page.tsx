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

export default async function InventoryPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  const searchParams = props.searchParams ? await props.searchParams : undefined
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
      orderBy: { updatedAt: 'desc' }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-2">
            Manage all outsole inventory. Total SKUs: {totalSku} | Total Stock: {realTotalStock}
          </p>
        </div>
        <DashboardSearch />
      </div>

      <div className="space-y-4">
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
