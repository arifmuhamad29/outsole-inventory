"use client"

import { useEffect, useState, useTransition, useCallback } from "react"
import { useSession } from "next-auth/react"
import { getTrackingEntries, createTrackingEntry, updateTrackingEntry, deleteTrackingEntry } from "@/app/actions/tracking"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  ShoppingCart, Search, Plus, Pencil, Trash2, Loader2,
  CheckCircle2, Clock, Package, X
} from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

type TrackingEntry = {
  id: string
  article: string
  modelName: string
  specifications: string | null
  isOrdered: boolean
  poNumber: string | null
  supplier: string | null
  targetQty: number
  etaDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

type FormData = {
  article: string
  modelName: string
  specifications: string
  isOrdered: boolean
  poNumber: string
  supplier: string
  targetQty: number
  etaDate: string
  notes: string
}

const emptyForm: FormData = {
  article: "",
  modelName: "",
  specifications: "",
  isOrdered: false,
  poNumber: "",
  supplier: "",
  targetQty: 0,
  etaDate: "",
  notes: "",
}

export default function TrackingPage() {
  const { data: session } = useSession()
  const [entries, setEntries] = useState<TrackingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TrackingEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [isPending, startTransition] = useTransition()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getTrackingEntries({
        search: debouncedSearch,
        page: currentPage,
        limit: 25,
      })
      setEntries(result.entries as unknown as TrackingEntry[])
      setTotalPages(result.totalPages)
      setTotalCount(result.totalCount)
    } catch (error) {
      console.error("Failed to load tracking data", error)
      toast.error("Gagal memuat data tracking")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, currentPage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Open Add dialog
  const handleAdd = () => {
    setEditingEntry(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  // Open Edit dialog
  const handleEdit = (entry: TrackingEntry) => {
    setEditingEntry(entry)
    setFormData({
      article: entry.article,
      modelName: entry.modelName,
      specifications: entry.specifications || "",
      isOrdered: entry.isOrdered,
      poNumber: entry.poNumber || "",
      supplier: entry.supplier || "",
      targetQty: entry.targetQty,
      etaDate: entry.etaDate ? new Date(entry.etaDate).toISOString().split("T")[0] : "",
      notes: entry.notes || "",
    })
    setIsFormOpen(true)
  }

  // Submit form (create or update)
  const handleSubmit = () => {
    if (!formData.article.trim() || !formData.modelName.trim()) {
      toast.error("Article dan Model Name wajib diisi!")
      return
    }

    startTransition(async () => {
      const payload = {
        article: formData.article,
        modelName: formData.modelName,
        specifications: formData.specifications || undefined,
        isOrdered: formData.isOrdered,
        poNumber: formData.poNumber || undefined,
        supplier: formData.supplier || undefined,
        targetQty: formData.targetQty,
        etaDate: formData.etaDate || undefined,
        notes: formData.notes || undefined,
      }

      const result = editingEntry
        ? await updateTrackingEntry(editingEntry.id, payload)
        : await createTrackingEntry(payload)

      if (result.success) {
        toast.success(result.message)
        setIsFormOpen(false)
        fetchData()
      } else {
        toast.error(result.message)
      }
    })
  }

  // Delete entry
  const handleDelete = () => {
    if (!deletingId) return
    startTransition(async () => {
      const result = await deleteTrackingEntry(deletingId)
      if (result.success) {
        toast.success(result.message)
        setIsDeleteOpen(false)
        setDeletingId(null)
        fetchData()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tracking Pembelian</h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} total entri terdaftar
            </p>
          </div>
        </div>

        <Button
          onClick={handleAdd}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all duration-300"
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Data
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari article, model, PO, supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border/50 focus:border-violet-500/50 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[50px] text-center font-semibold">#</TableHead>
                <TableHead className="font-semibold">Article</TableHead>
                <TableHead className="font-semibold">Model</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold">PO Number</TableHead>
                <TableHead className="font-semibold">Supplier</TableHead>
                <TableHead className="font-semibold text-center">Qty</TableHead>
                <TableHead className="font-semibold">ETA</TableHead>
                <TableHead className="font-semibold">Catatan</TableHead>
                <TableHead className="font-semibold text-center w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      <span className="text-sm text-muted-foreground">Memuat data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Package className="h-10 w-10 opacity-30" />
                      <span className="text-sm">
                        {debouncedSearch ? "Tidak ditemukan data yang cocok" : "Belum ada data tracking"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow
                    key={entry.id}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="text-center text-muted-foreground text-xs">
                      {(currentPage - 1) * 25 + index + 1}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-sm">
                      {entry.article}
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[180px] truncate">
                      {entry.modelName}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.isOrdered ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 gap-1 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          ORDERED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/15 gap-1 font-semibold">
                          <Clock className="h-3.5 w-3.5" />
                          NOT YET
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.poNumber || <span className="opacity-40">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {entry.supplier || <span className="opacity-40">-</span>}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-sm">
                      {entry.targetQty > 0 ? entry.targetQty.toLocaleString() : <span className="text-muted-foreground opacity-40">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.etaDate ? format(new Date(entry.etaDate), "dd MMM yyyy", { locale: localeId }) : <span className="opacity-40">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {entry.notes || <span className="opacity-40">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-violet-600 hover:bg-violet-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => handleEdit(entry)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => {
                            setDeletingId(entry.id)
                            setIsDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Halaman {currentPage} dari {totalPages} ({totalCount} data)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ============ ADD / EDIT DIALOG ============ */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-violet-500" />
              {editingEntry ? "Edit Tracking" : "Tambah Data Tracking"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry ? "Perbarui informasi pembelian di bawah ini." : "Masukkan informasi tracking pembelian baru."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Row: Article + Model */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="article" className="text-xs font-medium">Article <span className="text-red-500">*</span></Label>
                <Input
                  id="article"
                  placeholder="HQ0170"
                  value={formData.article}
                  onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="modelName" className="text-xs font-medium">Model Name <span className="text-red-500">*</span></Label>
                <Input
                  id="modelName"
                  placeholder="VL COURT 3.0"
                  value={formData.modelName}
                  onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                />
              </div>
            </div>

            {/* Specifications */}
            <div className="space-y-1.5">
              <Label htmlFor="specifications" className="text-xs font-medium">Spesifikasi</Label>
              <Input
                id="specifications"
                placeholder="Material, Status Mold, dll"
                value={formData.specifications}
                onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
              />
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Status Pemesanan</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isOrdered ? "✅ Sudah di-order" : "⏳ Belum di-order"}
                </p>
              </div>
              <Switch
                checked={formData.isOrdered}
                onCheckedChange={(checked) => setFormData({ ...formData, isOrdered: checked })}
              />
            </div>

            {/* Row: PO + Supplier */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="poNumber" className="text-xs font-medium">No. PO</Label>
                <Input
                  id="poNumber"
                  placeholder="PO-2026-001"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplier" className="text-xs font-medium">Supplier</Label>
                <Input
                  id="supplier"
                  placeholder="Nama vendor"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>
            </div>

            {/* Row: Qty + ETA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="targetQty" className="text-xs font-medium">Target Qty</Label>
                <Input
                  id="targetQty"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.targetQty || ""}
                  onChange={(e) => setFormData({ ...formData, targetQty: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="etaDate" className="text-xs font-medium">ETA Date</Label>
                <Input
                  id="etaDate"
                  type="date"
                  value={formData.etaDate}
                  onChange={(e) => setFormData({ ...formData, etaDate: e.target.value })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                editingEntry ? "Simpan Perubahan" : "Tambah Data"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE CONFIRMATION ============ */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Tracking?</AlertDialogTitle>
            <AlertDialogDescription>
              Data ini akan dihapus secara permanen dan tidak bisa dikembalikan. Yakin ingin melanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
