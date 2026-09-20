import prisma from "@/lib/prisma"
import { HandoverClient } from "./components/handover-client"

export default async function HandoverPage() {
  const handovers = await prisma.handover.findMany({
    include: {
      items: true
    },
    orderBy: {
      date: 'desc'
    }
  })

  // Separate handovers by type
  const toolingHandovers = handovers.filter(h => h.items.every(i => i.toolName !== "Outsole"))
  const outsoleHandovers = handovers.filter(h => h.items.some(i => i.toolName === "Outsole"))

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-send w-8 h-8 text-primary"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            Riwayat Serah Terima
          </h2>
          <p className="text-muted-foreground">
            Catatan serah terima Tooling dan Outsole.
          </p>
        </div>
      </div>

      <HandoverClient 
        toolingData={toolingHandovers} 
        outsoleData={outsoleHandovers} 
      />
    </div>
  )
}
