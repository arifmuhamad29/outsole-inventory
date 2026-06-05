"use client"

import { useEffect, useState, useTransition } from "react"
import { getBpmTfmStocks, deleteBpmTfmStockAction } from "@/app/actions/bpm-tfm"
import { BpmTfmStock } from "@prisma/client"
import { Layers, Loader2, Search, Trash2 } from "lucide-react"
import { BpmTfmCsvImporter } from "@/components/bpm-tfm/csv-importer"
import { ManualEntryModal } from "@/components/bpm-tfm/manual-entry-modal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function BpmTfmPage() {
  const [stocks, setStocks] = useState<BpmTfmStock[]>([])
  const [filteredStocks, setFilteredStocks] = useState<BpmTfmStock[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const data = await getBpmTfmStocks()
      setStocks(data)
      setFilteredStocks(data)
    } catch (error) {
      console.error("Failed to load BPM/TFM stocks", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStocks(stocks)
    } else {
      const q = searchQuery.toLowerCase()
      setFilteredStocks(
        stocks.filter(
          (s) =>
            s.codeLast.toLowerCase().includes(q) ||
            s.toolName.toLowerCase().includes(q) ||
            (s.type && s.type.toLowerCase().includes(q)) ||
            s.size.toLowerCase().includes(q)
        )
      )
    }
  }, [searchQuery, stocks])

  const handleDelete = () => {
    if (!itemToDelete) return
    startTransition(async () => {
      const res = await deleteBpmTfmStockAction(itemToDelete)
      if (res.success) {
        setItemToDelete(null)
        fetchData()
      }
    })
  }

  // Helper: determine if a row is the first occurrence of its codeLast group
  const isFirstInGroup = (index: number) => {
    if (index === 0) return true
    return filteredStocks[index].codeLast !== filteredStocks[index - 1].codeLast
  }

  // Helper: count how many rows share the same codeLast starting from index
  const getGroupSize = (index: number) => {
    const code = filteredStocks[index].codeLast
    let count = 0
    for (let i = index; i < filteredStocks.length; i++) {
      if (filteredStocks[i].codeLast === code) count++
      else break
    }
    return count
  }

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
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search code last, tool name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white"
            />
          </div>
          <BpmTfmCsvImporter onSuccess={fetchData} />
          <ManualEntryModal onSuccess={fetchData} />
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-md border bg-white shadow-sm">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-end">
          <div className="text-sm text-slate-500 font-medium">
            Showing {filteredStocks.length} Records
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="font-semibold text-slate-700">CODE LAST</TableHead>
              <TableHead className="font-semibold text-slate-700">TOOL NAME</TableHead>
              <TableHead className="font-semibold text-slate-700">TYPE</TableHead>
              <TableHead className="font-semibold text-slate-700">SIZE</TableHead>
              <TableHead className="font-semibold text-slate-700 text-center">DEV STOCK (SET)</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="w-10 h-10 text-slate-300" />
                    <p className="text-sm font-medium">No data found.</p>
                    <p className="text-xs text-slate-400">Use the Bulk Import button to upload your CSV data.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStocks.map((stock, index) => {
                const firstInGroup = isFirstInGroup(index)
                const groupSize = firstInGroup ? getGroupSize(index) : 0
                const isEvenGroup =
                  (() => {
                    // Count which group number this row belongs to
                    let groupIndex = 0
                    let prevCode = ""
                    for (let i = 0; i <= index; i++) {
                      if (filteredStocks[i].codeLast !== prevCode) {
                        groupIndex++
                        prevCode = filteredStocks[i].codeLast
                      }
                    }
                    return groupIndex % 2 === 0
                  })()

                return (
                  <TableRow
                    key={stock.id}
                    className={`
                      ${isEvenGroup ? "bg-slate-50/70" : "bg-white"}
                      ${firstInGroup ? "border-t-2 border-t-slate-200" : "border-t border-t-slate-100"}
                    `}
                  >
                    <TableCell className="font-semibold text-slate-800">
                      {firstInGroup ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold">
                            {groupSize}
                          </span>
                          {stock.codeLast}
                        </div>
                      ) : (
                        <span className="text-slate-300 pl-9">↳</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{stock.toolName}</TableCell>
                    <TableCell className="text-slate-600">{stock.type || "—"}</TableCell>
                    <TableCell className="text-slate-600">{stock.size}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-full text-sm font-semibold ${
                        stock.devStock === 0
                          ? "bg-red-100 text-red-700"
                          : stock.devStock <= 2
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {stock.devStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setItemToDelete(stock.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                        disabled={isPending}
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Stock?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data stock ini akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500 text-white"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
