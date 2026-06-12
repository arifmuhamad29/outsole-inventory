"use client"

import { useEffect, useState, useCallback } from "react"
import { getPublicTrackingEntries } from "@/app/actions/tracking"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { Search, Loader2, ShoppingCart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"

// Simplified Types
type TrackingEntryGrouped = {
  batchId: string
  article: string
  modelName: string
  genderCategory: string
  midsoleMaterial: string | null
  outsoleMaterial: string | null
  midsoleColor: string | null
  outsoleColor: string | null
  bottomTreatment: string | null
  imageUrl: string | null
  totalSizes: number
  totalQuantity: number
  isOrdered: boolean
  poNumber: string | null
  supplier: string | null
  etaDate: Date | string | null
}

export function PublicTrackingView() {
  const [entries, setEntries] = useState<TrackingEntryGrouped[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPublicTrackingEntries({
        search: debouncedSearch,
      })
      setEntries(result.entries as unknown as TrackingEntryGrouped[])
    } catch (error) {
      console.error("Failed to load tracking data", error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Purchase Tracking</h2>
        <p className="text-slate-500 text-sm">Public overview of purchase tracking entries and their delivery status.</p>
      </div>

      <div className="relative w-full sm:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input 
          placeholder="Search article, model, PO..." 
          className="pl-9 h-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
        <Table className="text-sm">
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-[60px] text-center">Visual</TableHead>
              <TableHead className="font-semibold text-slate-700">Article</TableHead>
              <TableHead className="font-semibold text-slate-700">Model Name</TableHead>
              <TableHead className="font-semibold text-slate-700">Material / Color</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">Size</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">Total QTY</TableHead>
              <TableHead className="text-center font-semibold text-slate-700">Status</TableHead>
              <TableHead className="font-semibold text-slate-700">PO / Supplier</TableHead>
              <TableHead className="font-semibold text-slate-700">ETA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                    Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center text-slate-500">
                  Tidak ada data tracking ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.batchId} className="hover:bg-slate-50/50">
                  <TableCell className="text-center p-2">
                    {entry.imageUrl ? (
                      <div className="h-12 w-12 mx-auto rounded-md border border-slate-200 overflow-hidden bg-white shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={entry.imageUrl} alt={entry.article} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 mx-auto rounded-md border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                        <ShoppingCart className="h-4 w-4 text-slate-300" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{entry.article}</TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-800">{entry.modelName}</div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">{entry.genderCategory}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="grid grid-cols-[30px_1fr] gap-x-1 gap-y-1 items-center">
                      <span className="text-slate-400 font-medium text-[10px]">MID:</span>
                      <span className="font-semibold text-slate-700 truncate">{entry.midsoleMaterial || "-"} / {entry.midsoleColor || "-"}</span>
                      <span className="text-slate-400 font-medium text-[10px]">OUT:</span>
                      <span className="font-semibold text-slate-700 truncate">{entry.outsoleMaterial || "-"} / {entry.outsoleColor || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono font-semibold text-sm">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none font-bold">
                      {entry.totalSizes} Size
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-extrabold text-[15px] text-slate-800">
                    {entry.totalQuantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {entry.isOrdered ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm font-bold">ORDERED</Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-600 border border-amber-200 shadow-sm font-bold">PENDING</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-bold text-slate-800">{entry.poNumber || "-"}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[120px] font-medium">{entry.supplier || "-"}</div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500 font-medium">
                    {entry.etaDate ? format(new Date(entry.etaDate), "dd MMM yyyy", { locale: localeId }) : <span className="opacity-40">-</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  )
}
