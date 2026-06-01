import { InboundForm } from "@/components/features/inbound-form"

export default function InboundPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inbound</h1>
        <p className="text-muted-foreground mt-2">
          Add new stock to the inventory or create new outsole models.
        </p>
      </div>
      
      <InboundForm />
    </div>
  )
}
