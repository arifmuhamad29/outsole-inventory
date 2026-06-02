import { InboundForm } from "@/components/features/inbound-form"
import prisma from "@/lib/prisma"

export default async function InboundPage() {
  const dbModels = await prisma.outsole.findMany({
    distinct: ['model'],
    select: { model: true },
    where: { model: { not: '' } }
  });
  const dynamicModels = dbModels.map(m => m.model);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inbound</h1>
        <p className="text-muted-foreground mt-2">
          Add new stock to the inventory or create new outsole models.
        </p>
      </div>
      
      <InboundForm dynamicModels={dynamicModels} />
    </div>
  )
}
