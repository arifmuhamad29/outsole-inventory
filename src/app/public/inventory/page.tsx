import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { DashboardSearch } from "@/components/features/dashboard-search"
import { Suspense } from "react"
import { InventoryTable } from "@/components/features/inventory-table"
import { Package } from "lucide-react"

export default async function PublicInventoryPage(props: { searchParams?: Promise<{ q?: string | string[], status?: string | string[] }> }) {
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="h-16 flex items-center px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Package className="w-6 h-6 text-primary mr-2 shrink-0" />
        <div className="flex flex-col justify-center">
          <span className="font-bold text-sm leading-tight tracking-tight">DEVELOPMENT OUTSOLE INVENTORY</span>
          <span className="text-[10px] text-muted-foreground block">Public Access</span>
        </div>
      </header>
      
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
              <p className="text-muted-foreground mt-2">
                Public stock overview. Total SKUs: {totalSku} | Total Stock: {realTotalStock}
              </p>
            </div>
            <Suspense fallback={<div className="animate-pulse h-10 w-full max-w-sm bg-gray-200 dark:bg-gray-700 rounded-md"></div>}>
              <DashboardSearch />
            </Suspense>
          </div>

          <div className="space-y-4">
            <InventoryTable outsoles={outsoles} isAdmin={false} readOnly={true} />
          </div>
        </div>
      </main>
    </div>
  )
}
