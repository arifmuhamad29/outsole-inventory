"use client"

import { useEffect, useState, useTransition, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  getTrackingEntries,
  getModelNamesFromTooling,
  createTrackingEntry,
  updateTrackingEntry,
  deleteTrackingEntry,
} from "@/app/actions/tracking"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  ShoppingCart, Search, Plus, Pencil, Trash2, Loader2,
  CheckCircle2, Clock, Package, X, ChevronDown, Check,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ============ Types ============

type TrackingEntry = {
  id: string
  article: string
  modelName: string
  midsoleMaterial: string | null
  outsoleMaterial: string | null
  midsoleColor: string | null
  outsoleColor: string | null
  bottomTreatment: string | null
  size: string
  quantity: number
  isOrdered: boolean
  poNumber: string | null
  supplier: string | null
  etaDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

type FormData = {
  article: string
  modelName: string
  midsoleMaterial: string
  outsoleMaterial: string
  midsoleColor: string
  outsoleColor: string
  bottomTreatment: string
  size: string
  quantity: number
  isOrdered: boolean
  poNumber: string
  supplier: string
  etaDate: string
  notes: string
}

const emptyForm: FormData = {
  article: "",
  modelName: "",
  midsoleMaterial: "",
  outsoleMaterial: "",
  midsoleColor: "",
  outsoleColor: "",
  bottomTreatment: "",
  size: "",
  quantity: 0,
  isOrdered: false,
  poNumber: "",
  supplier: "",
  etaDate: "",
  notes: "",
}

const TREATMENT_OPTIONS = ["Spray", "Marble", "Spackle"]

// ============ Model Name Combobox ============

function ModelCombobox({
  value,
  onChange,
  modelNames,
}: {
  value: string
  onChange: (val: string) => void
  modelNames: string[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = modelNames.filter((m) =>
    m.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{value || "Pilih Model..."}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-2">
            <Input
              placeholder="Cari model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground text-center">
                Model tidak ditemukan
              </p>
            ) : (
              filtered.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent cursor-pointer text-left",
                    value === name && "bg-accent"
                  )}
                >
                  <Check
                    className={cn("h-3.5 w-3.5 shrink-0", value === name ? "opacity-100" : "opacity-0")}
                  />
                  {name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Main Page ============

export default function TrackingPage() {
  const { data: session } = useSession()
  const [entries, setEntries] = useState<TrackingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [modelNames, setModelNames] = useState<string[]>([])

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

  // Load model names on mount
  useEffect(() => {
    getModelNamesFromTooling()
      .then(setModelNames)
      .catch(() => console.error("Failed to load model names"))
  }, [])

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
      midsoleMaterial: entry.midsoleMaterial || "",
      outsoleMaterial: entry.outsoleMaterial || "",
      midsoleColor: entry.midsoleColor || "",
      outsoleColor: entry.outsoleColor || "",
      bottomTreatment: entry.bottomTreatment || "",
      size: entry.size,
      quantity: entry.quantity,
      isOrdered: entry.isOrdered,
      poNumber: entry.poNumber || "",
      supplier: entry.supplier || "",
      etaDate: entry.etaDate ? new Date(entry.etaDate).toISOString().split("T")[0] : "",
      notes: entry.notes || "",
    })
    setIsFormOpen(true)
  }

  // Submit form
  const handleSubmit = () => {
    if (!formData.article.trim() || !formData.modelName.trim() || !formData.size.trim()) {
      toast.error("Article, Model Name, dan Size wajib diisi!")
      return
    }

    startTransition(async () => {
      const payload = {
        article: formData.article,
        modelName: formData.modelName,
        midsoleMaterial: formData.midsoleMaterial || undefined,
        outsoleMaterial: formData.outsoleMaterial || undefined,
        midsoleColor: formData.midsoleColor || undefined,
        outsoleColor: formData.outsoleColor || undefined,
        bottomTreatment: formData.bottomTreatment || undefined,
        size: formData.size,
        quantity: formData.quantity,
        isOrdered: formData.isOrdered,
        poNumber: formData.poNumber || undefined,
        supplier: formData.supplier || undefined,
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

  // Delete
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
          placeholder="Cari article, model, PO, supplier, size..."
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
                <TableHead className="w-[40px] text-center font-semibold">#</TableHead>
                <TableHead className="font-semibold">Article</TableHead>
                <TableHead className="font-semibold">Model</TableHead>
                <TableHead className="font-semibold">Material</TableHead>
                <TableHead className="font-semibold">Treatment</TableHead>
                <TableHead className="font-semibold text-center">Size</TableHead>
                <TableHead className="font-semibold text-center">QTY</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold">PO / Supplier</TableHead>
                <TableHead className="font-semibold">ETA</TableHead>
                <TableHead className="font-semibold text-center w-[90px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      <span className="text-sm text-muted-foreground">Memuat data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center">
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
                    <TableCell className="font-medium text-sm max-w-[150px] truncate">
                      {entry.modelName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px]">
                      <div className="space-y-0.5">
                        {entry.midsoleMaterial && (
                          <div>M/S: <span className="text-foreground">{entry.midsoleMaterial}</span>{entry.midsoleColor && <span className="text-violet-500"> ({entry.midsoleColor})</span>}</div>
                        )}
                        {entry.outsoleMaterial && (
                          <div>O/S: <span className="text-foreground">{entry.outsoleMaterial}</span>{entry.outsoleColor && <span className="text-violet-500"> ({entry.outsoleColor})</span>}</div>
                        )}
                        {!entry.midsoleMaterial && !entry.outsoleMaterial && (
                          <span className="opacity-40">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.bottomTreatment ? (
                        <Badge variant="outline" className="text-xs font-medium">
                          {entry.bottomTreatment}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground opacity-40">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono font-semibold text-sm">
                      {entry.size}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-sm">
                      {entry.quantity > 0 ? entry.quantity.toLocaleString() : <span className="text-muted-foreground opacity-40">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.isOrdered ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 gap-1 font-semibold text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          ORDERED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/15 gap-1 font-semibold text-xs">
                          <Clock className="h-3 w-3" />
                          NOT YET
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[140px]">
                      <div className="space-y-0.5">
                        <div className="text-muted-foreground truncate">{entry.poNumber || <span className="opacity-40">-</span>}</div>
                        {entry.supplier && <div className="text-xs text-violet-500 truncate">{entry.supplier}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.etaDate ? format(new Date(entry.etaDate), "dd MMM yyyy", { locale: localeId }) : <span className="opacity-40">-</span>}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
            {/* Section: Identitas */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identitas Barang</p>
              <div className="h-px bg-border" />
            </div>

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
                <Label className="text-xs font-medium">Model Name <span className="text-red-500">*</span></Label>
                <ModelCombobox
                  value={formData.modelName}
                  onChange={(val) => setFormData({ ...formData, modelName: val })}
                  modelNames={modelNames}
                />
              </div>
            </div>

            {/* Section: Spesifikasi Material */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spesifikasi Material</p>
              <div className="h-px bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="midsoleMaterial" className="text-xs font-medium">Midsole Material</Label>
                <Input
                  id="midsoleMaterial"
                  placeholder="Phylon, EVA, dll"
                  value={formData.midsoleMaterial}
                  onChange={(e) => setFormData({ ...formData, midsoleMaterial: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="midsoleColor" className="text-xs font-medium">Midsole Color</Label>
                <Input
                  id="midsoleColor"
                  placeholder="White, Black, dll"
                  value={formData.midsoleColor}
                  onChange={(e) => setFormData({ ...formData, midsoleColor: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="outsoleMaterial" className="text-xs font-medium">Outsole Material</Label>
                <Input
                  id="outsoleMaterial"
                  placeholder="Rubber, TPU, dll"
                  value={formData.outsoleMaterial}
                  onChange={(e) => setFormData({ ...formData, outsoleMaterial: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="outsoleColor" className="text-xs font-medium">Outsole Color</Label>
                <Input
                  id="outsoleColor"
                  placeholder="White, Gum, dll"
                  value={formData.outsoleColor}
                  onChange={(e) => setFormData({ ...formData, outsoleColor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Bottom Treatment</Label>
              <Select
                value={formData.bottomTreatment}
                onValueChange={(val) => setFormData({ ...formData, bottomTreatment: val === "none" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih treatment..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  {TREATMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section: Size & Quantity */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Size & Quantity</p>
              <div className="h-px bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="size" className="text-xs font-medium">Size <span className="text-red-500">*</span></Label>
                <Input
                  id="size"
                  placeholder="42, 8T, dll"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-xs font-medium">QTY Size</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.quantity || ""}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Section: Status & PO */}
            <div className="space-y-1 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status Pemesanan</p>
              <div className="h-px bg-border" />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Status Order</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.isOrdered ? "✅ Sudah di-order" : "⏳ Belum di-order"}
                </p>
              </div>
              <Switch
                checked={formData.isOrdered}
                onCheckedChange={(checked) => setFormData({ ...formData, isOrdered: checked })}
              />
            </div>

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

            <div className="space-y-1.5">
              <Label htmlFor="etaDate" className="text-xs font-medium">ETA Date</Label>
              <Input
                id="etaDate"
                type="date"
                value={formData.etaDate}
                onChange={(e) => setFormData({ ...formData, etaDate: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
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
