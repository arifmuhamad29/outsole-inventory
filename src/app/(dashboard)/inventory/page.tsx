import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { DebouncedSearch } from "@/components/ui/DebouncedSearch"
import { StatusFilter } from "@/components/ui/StatusFilter"
import { PaginationControls } from "@/components/ui/PaginationControls"
import { Suspense } from "react"
import { InventoryTable } from "@/components/features/inventory-table"

export default async function InventoryPage(props: { 
  searchParams?: Promise<{ 
    search?: string | string[]
    page?: string | string[]
    status?: string | string[] 
  }> 
}) {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"
  
  const resolvedParams = props.searchParams ? await props.searchParams : {}
  const rawSearch = resolvedParams.search
  const search = typeof rawSearch === 'string' ? rawSearch : ""
  
  const rawPage = resolvedParams.page
  const currentPage = typeof rawPage === 'string' ? Math.max(1, parseInt(rawPage) || 1) : 1
  
  const rawStatus = resolvedParams.status
  const statusFilter = typeof rawStatus === 'string' ? rawStatus : "all"

  const whereClause: Prisma.OutsoleWhereInput = {
    isActive: true,
  }

  if (search) {
    whereClause.OR = [
      { model: { contains: search, mode: "insensitive" } },
      { article: { contains: search, mode: "insensitive" } },
      { qrCode: { contains: search, mode: "insensitive" } },
      { color: { contains: search, mode: "insensitive" } },
      { poNumber: { contains: search, mode: "insensitive" } },
      { size: { contains: search, mode: "insensitive" } }
    ]
  }

  if (statusFilter === "lowstock") {
    whereClause.stock = { lte: prisma.outsole.fields.minimumStock }
  } else if (statusFilter === "instock") {
    whereClause.stock = { gt: prisma.outsole.fields.minimumStock }
  }

  const limit = 25
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

  // 3. Fetch transaction details only for the 25 outsoles currently visible
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-2">
            Manage all outsole inventory. Total SKUs: {totalSku} | Total Stock: {realTotalStock}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
          <Suspense fallback={<div className="animate-pulse h-9 w-full sm:w-64 bg-gray-200 dark:bg-gray-700 rounded-md"></div>}>
            <DebouncedSearch />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-9 w-full sm:w-36 bg-gray-200 dark:bg-gray-700 rounded-md"></div>}>
            <StatusFilter />
          </Suspense>
        </div>
      </div>

      <div className="space-y-4">
        <InventoryTable outsoles={outsoles} isAdmin={isAdmin} readOnly={!isAdmin} />
        
        <PaginationControls 
          totalPages={Math.ceil(totalCount / limit)} 
          currentPage={currentPage} 
        />
      </div>
    </div>
  )
}
