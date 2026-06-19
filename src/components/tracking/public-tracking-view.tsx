"use client"

import { useEffect, useState, useCallback } from "react"
import { getPublicTrackingEntries, getSeasons } from "@/app/actions/tracking"
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
import { Dialog, DialogContent } from "@/components/ui/dialog"

const SHOE_SIZE_ORDER = [
  '3K','3TK','4K','4TK','5K','5TK','6K','6TK','7K','7TK','8K','8TK','9K','9TK', // Infant
  '10K','10TK','11K','11TK','12K','12TK','13K','13TK','1','1T','2','2T','3','3T','4','4T', // Kids/Jr
  '5','5T','6','6T','7','7T','8','8T','9','9T','10','10T','11','11T','12','12T','13','13T','14','14T','15','16','17' // Men/Women
];

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
  sizesData?: { size: string; quantity: number }[]
  isOrdered: boolean
  poNumber: string | null
  supplier: string | null
  etaDate: Date | string | null
  notes: string | null
}

export function PublicTrackingView() {
  const [entries, setEntries] = useState<TrackingEntryGrouped[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  // Seasons
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [seasons, setSeasons] = useState<any[]>([])
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null)

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const data = await getSeasons()
        setSeasons(data)
        if (data.length > 0) {
          const ss27 = data.find(s => s.name === "SS27") || data[0]
          setActiveSeasonId(ss27.id)
        }
      } catch (error) {
        console.error("Failed to load seasons", error)
      }
    }
    fetchSeasons()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadData = useCallback(async () => {
    if (!activeSeasonId) return
    setLoading(true)
    try {
      const result = await getPublicTrackingEntries({
        search: debouncedSearch,
        seasonId: activeSeasonId,
      })
      setEntries(result.entries as unknown as TrackingEntryGrouped[])
    } catch (error) {
      console.error("Failed to load tracking data", error)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, activeSeasonId])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Purchase Tracking</h2>
        <p className="text-slate-500 text-sm">Public overview of purchase tracking entries and their delivery status.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          {seasons.map((season) => (
            <Button
              key={season.id}
              variant={activeSeasonId === season.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSeasonId(season.id)}
              className={activeSeasonId === season.id ? "bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md" : "rounded-full"}
            >
              {season.name}
            </Button>
          ))}
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
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
        <Table className="text-sm">
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="min-w-[60px] text-center whitespace-nowrap align-middle">Visual</TableHead>
              <TableHead className="min-w-[100px] font-semibold text-slate-700 whitespace-nowrap align-middle">Article</TableHead>
              <TableHead className="min-w-[130px] font-semibold text-slate-700 whitespace-nowrap align-middle">Model Name</TableHead>
              <TableHead className="min-w-[200px] w-[200px] font-semibold text-slate-700 whitespace-nowrap align-middle">Material / Color</TableHead>
              <TableHead className="min-w-[70px] w-[70px] font-semibold text-slate-700 whitespace-nowrap align-middle text-left">Treatment</TableHead>
              <TableHead className="min-w-[280px] w-full text-center font-semibold text-slate-700 whitespace-nowrap align-middle">Size</TableHead>
              <TableHead className="min-w-[80px] text-center font-semibold text-slate-700 whitespace-nowrap align-middle">Status</TableHead>
              <TableHead className="min-w-[90px] font-semibold text-slate-700 whitespace-nowrap align-middle">PO / Supplier</TableHead>
              <TableHead className="min-w-[80px] font-semibold text-slate-700 whitespace-nowrap align-middle">ETA</TableHead>
              <TableHead className="min-w-[100px] font-semibold text-slate-700 whitespace-nowrap align-middle">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                    Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-48 text-center text-slate-500">
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
                        <img 
                          src={entry.imageUrl} 
                          alt={entry.article} 
                          className="h-full w-full object-cover cursor-pointer hover:scale-105 transition" 
                          onClick={() => {
                            setSelectedImage(entry.imageUrl)
                            setIsImageModalOpen(true)
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 mx-auto rounded-md border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                        <ShoppingCart className="h-4 w-4 text-slate-300" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[100px] font-medium">{entry.article}</TableCell>
                  <TableCell className="min-w-[130px] max-w-[180px] whitespace-normal break-words">
                    <div className="font-bold text-slate-800 leading-tight">{entry.modelName}</div>
                    <div className="text-[11px] font-medium text-slate-500 mt-1">({entry.genderCategory})</div>
                  </TableCell>
                  <TableCell className="w-[200px] min-w-[200px] align-top text-xs">
                    <div className="flex flex-col gap-1.5">
                      <div className="leading-tight">
                        <span className="text-slate-400 font-medium text-[10px] mr-1">MID:</span>
                        <span className="font-semibold text-slate-700 whitespace-normal break-words">
                          {entry.midsoleMaterial || "-"} {entry.midsoleColor && entry.midsoleColor !== "-" ? `/ ${entry.midsoleColor}` : ""}
                        </span>
                      </div>
                      <div className="leading-tight">
                        <span className="text-slate-400 font-medium text-[10px] mr-1">OUT:</span>
                        <span className="font-semibold text-slate-700 whitespace-normal break-words">
                          {entry.outsoleMaterial || "-"} {entry.outsoleColor && entry.outsoleColor !== "-" ? `/ ${entry.outsoleColor}` : ""}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-700 align-top min-w-[70px] max-w-[80px] truncate" title={entry.bottomTreatment || "-"}>
                    {entry.bottomTreatment || "-"}
                  </TableCell>
                  <TableCell className="w-full min-w-[280px] align-top text-center font-mono font-semibold text-sm">
                    <div className="flex flex-wrap gap-1 w-full">
                      {(() => {
                        const sortedSizes = [...(entry.sizesData || [])].sort((a, b) => {
                          const indexA = SHOE_SIZE_ORDER.indexOf(a.size);
                          const indexB = SHOE_SIZE_ORDER.indexOf(b.size);
                          if (indexA === -1) return 1;
                          if (indexB === -1) return -1;
                          return indexA - indexB;
                        });
                        return sortedSizes.map((sd) => (
                          <div key={sd.size} className="flex flex-col items-center justify-center border rounded px-1 min-w-[26px] bg-muted/30">
                            <span className="text-[9px] font-bold text-muted-foreground border-b border-slate-200 w-full text-center pb-[1px] leading-[14px]">
                              {sd.size}
                            </span>
                            <span className="text-[10px] font-medium text-foreground pt-[1px] leading-[14px]">
                              {sd.quantity}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center min-w-[80px]">
                    {entry.isOrdered ? (
                      <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm font-bold text-[10px] px-1">ORDERED</Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-600 border border-amber-200 shadow-sm font-bold text-[10px] px-1">PENDING</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm min-w-[90px]">
                    <div className="font-bold text-slate-800">{entry.poNumber || "-"}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[100px] font-medium">{entry.supplier || "-"}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium min-w-[80px]">
                    {entry.etaDate ? format(new Date(entry.etaDate), "dd MMM yy", { locale: localeId }) : <span className="opacity-40">-</span>}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium min-w-[100px] max-w-[150px]">
                    <div className="truncate" title={entry.notes || ""}>
                      {entry.notes || <span className="opacity-40">-</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-3xl border-none bg-transparent shadow-none">
          {selectedImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={selectedImage} 
              alt="Full Size Preview" 
              className="w-full h-auto rounded-lg object-contain" 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
