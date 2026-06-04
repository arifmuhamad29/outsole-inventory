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
    const normalizedQuery = query.replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([a-zA-Z])/g, '$1 $2')
    const terms = normalizedQuery.trim().split(/\s+/)
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

  const [totalSku, outsolesRaw] = await Promise.all([
    prisma.outsole.count({ where: { isActive: true } }),
    prisma.outsole.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }
    })
  ])

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
