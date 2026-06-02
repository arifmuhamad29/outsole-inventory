import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { DashboardSearch } from "@/components/features/dashboard-search"
import { Suspense } from "react"
import { InventoryTable } from "@/components/features/inventory-table"

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
    const terms = query.trim().split(/\s+/)
    whereClause.AND = terms.map(term => ({
      OR: [
        { model: { contains: term, mode: "insensitive" } },
        { article: { contains: term, mode: "insensitive" } },
        { qrCode: { contains: term, mode: "insensitive" } },
        { color: { contains: term, mode: "insensitive" } },
        { poNumber: { contains: term, mode: "insensitive" } },
        { size: { contains: term, mode: "insensitive" } }
      ]
    }))
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
        <InventoryTable outsoles={outsoles} isAdmin={isAdmin} readOnly={!isAdmin} />
      </div>
    </div>
  )
}
