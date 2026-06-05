"use client"

import { useEffect, useState } from "react"
import { getBpmTfmStocks } from "@/app/actions/bpm-tfm"
import { BpmTfmStock } from "@prisma/client"
import { Layers, Loader2 } from "lucide-react"
import { BpmTfmTable } from "@/components/bpm-tfm/bpm-tfm-table"

export default function PublicBpmTfmPage() {
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
    <div className="flex flex-col space-y-6 p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-slate-800">
            <Layers className="w-8 h-8 text-primary" />
            BPM & TOE FORMING Stock
          </h1>
          <p className="text-slate-500 mt-1">
            Portal Informasi Publik untuk Ketersediaan Stok BPM, TFM, dan Universal Pad.
          </p>
        </div>
      </div>

      <BpmTfmTable
        data={stocks}
        isReadOnly={true}
      />
    </div>
  )
}
