"use client"

import { useEffect, useState } from "react"
import { getBpmTfmStocks } from "@/app/actions/bpm-tfm"
import { BpmTfmStock } from "@prisma/client"
import { Layers, Loader2 } from "lucide-react"
import { BpmTfmCsvImporter } from "@/components/bpm-tfm/csv-importer"
import { ManualEntryModal } from "@/components/bpm-tfm/manual-entry-modal"
import { BpmTfmTable } from "@/components/bpm-tfm/bpm-tfm-table"

export default function BpmTfmPage() {
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
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-8 h-8" />
            Stock BPM & TOE FORMING
          </h1>
          <p className="text-muted-foreground mt-1">
            Master Data for BPM, TFM, and Universal Pad Stock.
          </p>
        </div>
        {/* We moved the actions here if we want them separate from the table, but BpmTfmTable accepts actions prop. Let's pass them into the table to keep search and actions aligned. */}
      </div>

      <BpmTfmTable
        data={stocks}
        isReadOnly={false}
        onRefresh={fetchData}
        actions={
          <>
            <BpmTfmCsvImporter onSuccess={fetchData} />
            <ManualEntryModal onSuccess={fetchData} />
          </>
        }
      />
    </div>
  )
}
