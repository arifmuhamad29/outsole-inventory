"use client"

import { useState, useEffect, useTransition } from "react"
import { BpmTfmStock } from "@prisma/client"
import { Layers, Loader2, Search, Trash2, Pencil } from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { deleteBpmTfmStockAction, updateBpmTfmStockAction } from "@/app/actions/bpm-tfm"

interface BpmTfmTableProps {
  data: BpmTfmStock[]
  isReadOnly?: boolean
  onRefresh?: () => void
  actions?: React.ReactNode
}

export function BpmTfmTable({ data, isReadOnly = false, onRefresh, actions }: BpmTfmTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredStocks, setFilteredStocks] = useState<BpmTfmStock[]>(data)
  
  const [isPending, startTransition] = useTransition()
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [itemToEdit, setItemToEdit] = useState<BpmTfmStock | null>(null)
  const [editStockValue, setEditStockValue] = useState("")

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStocks(data)
    } else {
      const q = searchQuery.toLowerCase()
      setFilteredStocks(
        data.filter(
          (s) =>
            s.codeLast.toLowerCase().includes(q) ||
            s.toolName.toLowerCase().includes(q) ||
            (s.type && s.type.toLowerCase().includes(q)) ||
            s.size.toLowerCase().includes(q)
        )
      )
    }
  }, [searchQuery, data])

  const handleDelete = () => {
    if (!itemToDelete) return
    startTransition(async () => {
      const res = await deleteBpmTfmStockAction(itemToDelete)
      if (res.success) {
        setItemToDelete(null)
        if (onRefresh) onRefresh()
      }
    })
  }

  const handleEditSubmit = () => {
    if (!itemToEdit) return
    const numVal = parseInt(editStockValue, 10)
    if (isNaN(numVal) || numVal < 0) return
    startTransition(async () => {
      const res = await updateBpmTfmStockAction(itemToEdit.id, numVal)
      if (res.success) {
        setItemToEdit(null)
        if (onRefresh) onRefresh()
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

  return (
    <div className="flex flex-col space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto md:flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search code last, tool name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white"
            />
          </div>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {/* Table Container */}
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
              <TableHead className="font-semibold text-slate-700">LAST UPDATE</TableHead>
              {!isReadOnly && <TableHead className="text-right font-semibold text-slate-700">ACTION</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isReadOnly ? 6 : 7} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="w-10 h-10 text-slate-300" />
                    <p className="text-sm font-medium">No data found.</p>
                    {!isReadOnly && <p className="text-xs text-slate-400">Use the Bulk Import button to upload your CSV data.</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStocks.map((stock, index) => {
                const firstInGroup = isFirstInGroup(index)
                const groupSize = firstInGroup ? getGroupSize(index) : 0
                const isEvenGroup = (() => {
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
                    <TableCell className="text-slate-500 text-sm">
                      {new Date(stock.updatedAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    
                    {!isReadOnly && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItemToEdit(stock)
                              setEditStockValue(stock.devStock.toString())
                            }}
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2"
                            disabled={isPending}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
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
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isReadOnly && (
        <>
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

          <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Edit Dev Stock</DialogTitle>
                <DialogDescription>
                  Ubah jumlah Dev Stock untuk {itemToEdit?.toolName} {itemToEdit?.type ? `(${itemToEdit.type})` : ""} ukuran {itemToEdit?.size}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dev Stock (Set)</label>
                  <Input
                    type="number"
                    min={0}
                    value={editStockValue}
                    onChange={(e) => setEditStockValue(e.target.value)}
                    disabled={isPending}
                    className="w-full"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setItemToEdit(null)} disabled={isPending}>
                  Batal
                </Button>
                <Button onClick={handleEditSubmit} disabled={isPending || editStockValue === ""}>
                  {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
