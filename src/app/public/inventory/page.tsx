import prisma from "@/lib/prisma"
import { DebouncedSearch } from "@/components/ui/DebouncedSearch"
import { StatusFilter } from "@/components/ui/StatusFilter"
import { RowsPerPageFilter } from "@/components/ui/RowsPerPageFilter"
import { PaginationControls } from "@/components/ui/PaginationControls"
import { Suspense } from "react"
import { InventoryTable } from "@/components/features/inventory-table"
import { Package } from "lucide-react"
import { PublicPortalWrapper } from "@/components/tooling/public-portal-wrapper"
import { InventoryFilters, ActiveFilterChips } from "@/components/features/inventory-filters"
import { buildInventoryWhereClause } from "@/lib/inventory-search"

export default async function PublicInventoryPage(props: { 
  searchParams?: Promise<{ 
    search?: string | string[]
    model?: string | string[]
    article?: string | string[]
    color?: string | string[]
    size?: string | string[]
    poNumber?: string | string[]
    soleType?: string | string[]
    bottomTreatment?: string | string[]
    page?: string | string[]
    limit?: string | string[]
    status?: string | string[] 
  }> 
}) {
  const resolvedParams = props.searchParams ? await props.searchParams : {}
  const rawSearch = resolvedParams.search
  const search = typeof rawSearch === 'string' ? rawSearch : ""

  const model = typeof resolvedParams.model === 'string' ? resolvedParams.model : ""
  const article = typeof resolvedParams.article === 'string' ? resolvedParams.article : ""
  const color = typeof resolvedParams.color === 'string' ? resolvedParams.color : ""
  const size = typeof resolvedParams.size === 'string' ? resolvedParams.size : ""
  const poNumber = typeof resolvedParams.poNumber === 'string' ? resolvedParams.poNumber : ""
  const soleType = typeof resolvedParams.soleType === 'string' ? resolvedParams.soleType : ""
  const bottomTreatment = typeof resolvedParams.bottomTreatment === 'string' ? resolvedParams.bottomTreatment : ""
  
  const rawPage = resolvedParams.page
  const currentPage = typeof rawPage === 'string' ? Math.max(1, parseInt(rawPage) || 1) : 1
  
  const rawStatus = resolvedParams.status
  const statusFilter = typeof rawStatus === 'string' ? rawStatus : "all"

  const whereClause = buildInventoryWhereClause({
    search,
    model,
    article,
    color,
    size,
    poNumber,
    soleType,
    bottomTreatment,
    status: statusFilter,
  })

  const rawLimit = resolvedParams.limit
  const limit = typeof rawLimit === 'string' ? Math.max(1, parseInt(rawLimit) || 48) : 48
  const skip = (currentPage - 1) * limit

  // 1. Fetch paginated outsoles and total count concurrently using prisma.$transaction
  const [outsolesRaw, totalCount] = await prisma.$transaction([
    prisma.outsole.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.outsole.count({
      where: whereClause
    })
  ])

  // 2. Fetch overall SKUs and Stock aggregate in parallel
  const [totalSku, stockAgg] = await Promise.all([
    prisma.outsole.count({ where: { isActive: true } }),
    prisma.outsole.aggregate({
      _sum: { stock: true },
      where: { isActive: true }
    })
  ])
  const realTotalStock = stockAgg._sum.stock || 0

  // 3. Fetch transaction details only for the outsoles currently visible
  const outsoleIds = outsolesRaw.map(o => o.id)

  const [lastOutbounds, lastInbounds] = await Promise.all([
    outsoleIds.length > 0 ? prisma.transaction.findMany({
      where: { outsoleId: { in: outsoleIds }, type: 'OUTBOUND' },
      orderBy: { createdAt: 'desc' },
      distinct: ['outsoleId']
    }) : [],
    outsoleIds.length > 0 ? prisma.transaction.findMany({
      where: { outsoleId: { in: outsoleIds }, type: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
      distinct: ['outsoleId']
    }) : []
  ])

  const outsoles = outsolesRaw.map(o => {
    const ob = lastOutbounds.find(t => t.outsoleId === o.id)
    const ib = lastInbounds.find(t => t.outsoleId === o.id)
    const transactions = []
    if (ob) transactions.push(ob)
    if (ib) transactions.push(ib)
    return { ...o, transactions }
  })

  const isFiltered = totalCount !== totalSku

  const inventoryContent = (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outsole Inventory</h1>
          <p className="text-muted-foreground mt-2">
            Public stock overview. Total SKUs: {totalSku} | Total Stock: {realTotalStock}
            {isFiltered && (
              <span className="font-semibold text-primary ml-1.5">
                (Ditemukan {totalCount} SKU)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full sm:w-auto items-stretch sm:items-center">
          <Suspense fallback={<div className="animate-pulse h-9 w-full sm:w-64 bg-gray-200 dark:bg-gray-700 rounded-md"></div>}>
            <DebouncedSearch />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-md"></div>}>
            <InventoryFilters />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-9 w-full sm:w-36 bg-gray-200 dark:bg-gray-700 rounded-md"></div>}>
            <StatusFilter />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-9 w-[80px] bg-gray-200 dark:bg-gray-700 rounded-md"></div>}>
            <RowsPerPageFilter />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
        <ActiveFilterChips />
      </Suspense>

      <div className="space-y-4">
        <InventoryTable outsoles={outsoles} isAdmin={false} readOnly={true} />
        
        <PaginationControls 
          totalPages={Math.ceil(totalCount / limit)} 
          currentPage={currentPage} 
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="h-16 flex items-center px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Package className="w-6 h-6 text-primary mr-2 shrink-0" />
        <div className="flex flex-col justify-center">
          <span className="font-bold text-sm leading-tight tracking-tight">DEVELOPMENT OUTSOLE & TOOLING INVENTORY</span>
          <span className="text-[10px] text-muted-foreground block">Unified Public Portal</span>
        </div>
      </header>
      
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <PublicPortalWrapper inventoryContent={inventoryContent} />
      </main>
    </div>
  )
}
