import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { auth } from "@/lib/auth"
import { DashboardSearch } from "@/components/features/dashboard-search"
import { DashboardActions } from "@/components/features/dashboard-actions"
import { Suspense } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function InventoryPage(props: { searchParams?: Promise<{ q?: string | string[], status?: string | string[] }> }) {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  
  const resolvedParams = props.searchParams ? await props.searchParams : {}
  const rawQuery = resolvedParams.q
  const query = typeof rawQuery === 'string' ? rawQuery : ""
  
  const rawStatus = resolvedParams.status
  const statusFilter = typeof rawStatus === 'string' ? rawStatus : "all"

  const whereClause: Prisma.OutsoleWhereInput = {
    isActive: true,
  }

  if (query) {
    whereClause.OR = [
      { model: { contains: query, mode: "insensitive" } },
      { article: { contains: query, mode: "insensitive" } },
      { qrCode: { contains: query, mode: "insensitive" } },
      { color: { contains: query, mode: "insensitive" } }
    ]
  }

  if (statusFilter === "lowstock") {
    whereClause.stock = { lte: prisma.outsole.fields.minimumStock }
  } else if (statusFilter === "instock") {
    whereClause.stock = { gt: prisma.outsole.fields.minimumStock }
  }

  const [totalSku, outsoles] = await Promise.all([
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
    })
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
        <Suspense fallback={<div className="animate-pulse h-10 w-full max-w-sm bg-gray-200 dark:bg-gray-700 rounded-md"></div>}>
          <DashboardSearch />
        </Suspense>
      </div>

      <div className="space-y-4">
        <div className="rounded-md border bg-white dark:bg-gray-800 overflow-x-auto">
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
                    No inventory found matching your criteria.
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
