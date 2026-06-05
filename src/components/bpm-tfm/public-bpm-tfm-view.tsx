"use client"

import { useEffect, useState } from "react"
import { getBpmTfmStocks } from "@/app/actions/bpm-tfm"
import { BpmTfmStock } from "@prisma/client"
import { Loader2 } from "lucide-react"
import { BpmTfmTable } from "@/components/bpm-tfm/bpm-tfm-table"

export function PublicBpmTfmView() {
  const [stocks, setStocks] = useState<BpmTfmStock[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const data = await getBpmTfmStocks()
      setStocks(data)
    } catch (error) {
      console.error("Failed to load BPM/TFM stocks", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-slate-800">
            BPM & TOE FORMING Stock
          </h1>
          <p className="text-slate-500 mt-2">
            Public stock overview for BPM, TFM, and Universal Pad.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-4 md:p-6">
        <BpmTfmTable
          data={stocks}
          isReadOnly={true}
        />
      </div>
    </div>
  )
}
