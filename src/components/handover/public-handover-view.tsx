"use client"

import { useState, useEffect } from "react"
import { getHandoversAction } from "@/app/actions/handover"
import { HandoverClient } from "@/app/(dashboard)/handover/components/handover-client"
import { Loader2 } from "lucide-react"

export function PublicHandoverView() {
  const [handovers, setHandovers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getHandoversAction()
        setHandovers(data)
      } catch (error) {
        console.error("Failed to load handovers", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Memuat riwayat handover...</p>
      </div>
    )
  }

  // Separate handovers by type
  const toolingHandovers = handovers.filter(h => h.items.every((i: any) => i.toolName !== "Outsole"))
  const outsoleHandovers = handovers.filter(h => h.items.some((i: any) => i.toolName === "Outsole"))

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Riwayat Handover
        </h2>
        <p className="text-muted-foreground text-sm">
          Menampilkan catatan publik untuk serah terima Tooling dan Outsole.
        </p>
      </div>
      
      <HandoverClient 
        toolingData={toolingHandovers} 
        outsoleData={outsoleHandovers} 
        readOnly={true}
      />
    </div>
  )
}
