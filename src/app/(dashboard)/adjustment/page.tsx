import { AdjustmentForm } from "@/components/features/adjustment-form"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdjustmentPage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  const outsoles = await prisma.outsole.findMany({
    where: { isActive: true },
    select: {
      id: true,
      qrCode: true,
      model: true,
      article: true,
      color: true,
      size: true,
      stock: true
    },
    orderBy: { updatedAt: "desc" }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Adjustment</h1>
        <p className="text-muted-foreground mt-2">
          Manually correct stock levels. A reason is required for auditing purposes.
        </p>
      </div>
      
      <AdjustmentForm outsoles={outsoles} />
    </div>
  )
}
