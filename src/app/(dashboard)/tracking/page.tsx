"use client"

import { useEffect, useState, useTransition, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import {
  getTrackingEntries,
  getModelNamesFromTooling,
  getBatchSizes,
  createTrackingEntry,
  updateTrackingEntry,
  deleteTrackingEntry,
} from "@/app/actions/tracking"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  ShoppingCart, Search, Plus, Pencil, Trash2, Loader2,
  CheckCircle2, Clock, Package, X, ChevronDown, Check,
  ImageIcon, UploadCloud
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
// Ensure you have an Image component or just use <img> for base64
import Image from "next/image"

// ============ Constants ============

const GENDER_CATEGORIES = ["Men", "Women", "Infant", "Kids/Jr"]

const SIZES_MATRIX: Record<string, string[]> = {
  "Men": ["5", "5T", "6", "6T", "7", "7T", "8", "8T", "9", "9T", "10", "10T", "11", "11T", "12", "12T", "13", "13T", "14", "14T", "15", "16", "17"],
  "Women": ["3", "3T", "4", "4T", "5", "5T", "6", "6T", "7", "7T", "8", "8T", "9", "9T", "10"],
  "Infant": ["3K", "3TK", "4K", "4TK", "5K", "5TK", "6K", "6TK", "7K", "7TK", "8K", "8TK", "9K", "9TK"],
  "Kids/Jr": ["10K", "10TK", "11K", "11TK", "12K", "12TK", "13K", "13TK", "1", "1T", "2", "2T", "3", "3T", "4", "4T", "5", "5T", "6", "6T"],
}

const TREATMENT_OPTIONS = ["Spray", "Marble", "Spackle"]

// ============ Types ============

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
  etaDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

type FormValues = {
  article: string
  modelName: string
  genderCategory: string
  midsoleMaterial: string
  outsoleMaterial: string
  midsoleColor: string
  outsoleColor: string
  bottomTreatment: string
  imageUrl: string
  isOrdered: boolean
  poNumber: string
  supplier: string
  etaDate: string
  notes: string
  sizes: Record<string, string> 
}

const defaultValues: FormValues = {
  article: "",
  modelName: "",
  genderCategory: "Men",
  midsoleMaterial: "",
  outsoleMaterial: "",
  midsoleColor: "",
  outsoleColor: "",
  bottomTreatment: "",
  imageUrl: "",
  isOrdered: false,
  poNumber: "",
  supplier: "",
  etaDate: "",
  notes: "",
  sizes: {},
}

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
  const [entries, setEntries] = useState<TrackingEntryGrouped[]>([])
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
  const [isImageOpen, setIsImageOpen] = useState(false)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  
  const [isLoadingBatch, setIsLoadingBatch] = useState(false)
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form Hook
  const { register, handleSubmit, control, reset, watch, setValue } = useForm<FormValues>({
    defaultValues,
  })

  const watchCategory = watch("genderCategory")
  const watchImageUrl = watch("imageUrl")

  // Handle Image Upload (Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Quick validation
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Format foto harus JPG atau PNG")
      return
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error("Ukuran foto maksimal 2MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setValue("imageUrl", reader.result as string)
    }
    reader.readAsDataURL(file)
  }

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
      setEntries(result.entries as unknown as TrackingEntryGrouped[])
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
    setEditingBatchId(null)
    reset(defaultValues)
    setIsFormOpen(true)
  }

  // Open Edit dialog
  const handleEdit = async (entry: TrackingEntryGrouped) => {
    setEditingBatchId(entry.batchId)
    setIsLoadingBatch(true)
    setIsFormOpen(true)

    try {
      const sizesData = await getBatchSizes(entry.batchId)
      const sizesRecord = sizesData.reduce((acc, curr) => {
        acc[curr.size] = curr.quantity.toString()
        return acc
      }, {} as Record<string, string>)

      reset({
        article: entry.article,
        modelName: entry.modelName,
        genderCategory: entry.genderCategory || "Men",
        midsoleMaterial: entry.midsoleMaterial || "",
        outsoleMaterial: entry.outsoleMaterial || "",
        midsoleColor: entry.midsoleColor || "",
        outsoleColor: entry.outsoleColor || "",
        bottomTreatment: entry.bottomTreatment || "",
        imageUrl: entry.imageUrl || "",
        isOrdered: entry.isOrdered,
        poNumber: entry.poNumber || "",
        supplier: entry.supplier || "",
        etaDate: entry.etaDate ? new Date(entry.etaDate).toISOString().split("T")[0] : "",
        notes: entry.notes || "",
        sizes: sizesRecord,
      })
    } catch (error) {
      console.error(error)
      toast.error("Gagal memuat detail ukuran untuk batch ini")
    } finally {
      setIsLoadingBatch(false)
    }
  }

  // Submit form
  const onSubmit = (data: FormValues) => {
    // Process string sizes to number, filter out 0
    const processedSizes: Record<string, number> = {}
    Object.entries(data.sizes).forEach(([size, qtyStr]) => {
      const qty = parseInt(qtyStr)
      if (!isNaN(qty) && qty > 0) {
        processedSizes[size] = qty
      }
    })

    if (Object.keys(processedSizes).length === 0) {
      toast.error("Anda harus mengisi minimal satu kuantitas ukuran > 0")
      return
    }

    startTransition(async () => {
      const payload = {
        article: data.article,
        modelName: data.modelName,
        genderCategory: data.genderCategory,
        midsoleMaterial: data.midsoleMaterial || undefined,
        outsoleMaterial: data.outsoleMaterial || undefined,
        midsoleColor: data.midsoleColor || undefined,
        outsoleColor: data.outsoleColor || undefined,
        bottomTreatment: data.bottomTreatment || undefined,
        imageUrl: data.imageUrl || undefined,
        sizes: processedSizes,
        isOrdered: data.isOrdered,
        poNumber: data.poNumber || undefined,
        supplier: data.supplier || undefined,
        etaDate: data.etaDate || undefined,
        notes: data.notes || undefined,
      }

      const result = editingBatchId
        ? await updateTrackingEntry(editingBatchId, payload)
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
              {totalCount} Purchase Orders terdaftar
            </p>
          </div>
        </div>

        <Button
          onClick={handleAdd}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all duration-300"
        >
          <Plus className="mr-2 h-4 w-4" />
          Order Baru
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
                <TableHead className="w-[40px] text-center font-semibold">#</TableHead>
                <TableHead className="w-[60px] text-center font-semibold">Visual</TableHead>
                <TableHead className="font-semibold">Article</TableHead>
                <TableHead className="font-semibold">Model</TableHead>
                <TableHead className="font-semibold">Material</TableHead>
                <TableHead className="font-semibold">Treatment</TableHead>
                <TableHead className="font-semibold text-center">Sizes</TableHead>
                <TableHead className="font-semibold text-center">Total QTY</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold">PO / Supplier</TableHead>
                <TableHead className="font-semibold">ETA</TableHead>
                <TableHead className="font-semibold text-center w-[90px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      <span className="text-sm text-muted-foreground">Memuat data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Package className="h-10 w-10 opacity-30" />
                      <span className="text-sm">
                        {debouncedSearch ? "Tidak ditemukan data yang cocok" : "Belum ada PO / Order terdaftar"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow
                    key={entry.batchId}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="text-center text-muted-foreground text-xs">
                      {(currentPage - 1) * 25 + index + 1}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.imageUrl ? (
                        <div 
                          className="h-10 w-10 mx-auto rounded-md overflow-hidden border shadow-sm cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => {
                            setFullScreenImage(entry.imageUrl)
                            setIsImageOpen(true)
                          }}
                        >
                          <img src={entry.imageUrl} alt={entry.article} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 mx-auto rounded-md bg-muted flex items-center justify-center border">
                          <ImageIcon className="h-5 w-5 text-muted-foreground opacity-50" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-sm">
                      {entry.article}
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[150px] truncate">
                      {entry.modelName}
                      <span className="block text-xs text-muted-foreground">({entry.genderCategory})</span>
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
                      <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 border-none">
                        {entry.totalSizes} Ukuran
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm">
                      {entry.totalQuantity > 0 ? entry.totalQuantity.toLocaleString() : <span className="text-muted-foreground opacity-40">-</span>}
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
                        <div className="text-muted-foreground font-medium truncate">{entry.poNumber || <span className="opacity-40">-</span>}</div>
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
                            setDeletingId(entry.batchId)
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
              Halaman {currentPage} dari {totalPages} ({totalCount} PO terdaftar)
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

      {/* ============ ADD / EDIT MATRIX DIALOG ============ */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b bg-muted/10 shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-violet-500" />
                {editingBatchId ? "Edit Order Matrix" : "Tambah Order Matrix"}
              </DialogTitle>
              <DialogDescription>
                Pilih kategori gender, lalu isi jumlah pesanan pada kolom ukuran yang sesuai.
              </DialogDescription>
            </DialogHeader>

            {isLoadingBatch ? (
              <div className="flex flex-col items-center justify-center p-12 gap-4 h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="text-sm text-muted-foreground">Memuat detail matriks...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
                
                {/* Section: Foto & Identitas */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">1. Foto & Identitas</p>
                    <div className="h-px bg-border" />
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Foto Upload Zone */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Label className="text-xs font-medium">Foto Sepatu</Label>
                      <div className="relative group w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                        {watchImageUrl ? (
                          <>
                            <img src={watchImageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <UploadCloud className="h-6 w-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                            <span className="text-[10px] text-muted-foreground font-medium">Upload (Max 2MB)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleImageUpload}
                        />
                      </div>
                      {watchImageUrl && (
                        <button
                          type="button"
                          onClick={() => setValue("imageUrl", "")}
                          className="text-[10px] text-red-500 hover:underline text-center w-32"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Article <span className="text-red-500">*</span></Label>
                        <Input placeholder="HQ0170" {...register("article", { required: true })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Model Name <span className="text-red-500">*</span></Label>
                        <Controller
                          control={control}
                          name="modelName"
                          rules={{ required: true }}
                          render={({ field }) => (
                            <ModelCombobox
                              value={field.value}
                              onChange={field.onChange}
                              modelNames={modelNames}
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium">Gender Category <span className="text-red-500">*</span></Label>
                        <Controller
                          control={control}
                          name="genderCategory"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={(v) => {
                              field.onChange(v)
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Kategori..." />
                              </SelectTrigger>
                              <SelectContent>
                                {GENDER_CATEGORIES.map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Size Matrix */}
                <div className="space-y-4 bg-muted/20 p-4 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground tracking-tight">2. Size Run Matrix</p>
                    <Badge variant="outline" className="text-xs">
                      {watchCategory} Category
                    </Badge>
                  </div>
                  
                  {/* Matrix Horizontal Scroll Container */}
                  <div className="overflow-x-auto custom-scrollbar pb-2 pt-1">
                    <div className="flex gap-2 min-w-max">
                      {(SIZES_MATRIX[watchCategory] || SIZES_MATRIX["Men"]).map((sizeLabel) => (
                        <div key={sizeLabel} className="flex flex-col items-center gap-1.5 w-14">
                          <div className="h-6 px-2 flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs font-bold w-full">
                            {sizeLabel}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            placeholder="-"
                            className="h-8 text-center px-1 font-mono text-sm shadow-none focus-visible:ring-violet-500"
                            {...register(`sizes.${sizeLabel}`)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    * Kosongkan kolom atau isi dengan &apos;0&apos; jika ukuran tidak dipesan.
                  </p>
                </div>

                {/* Section: Spesifikasi Material */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">3. Spesifikasi Material</p>
                    <div className="h-px bg-border" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Midsole Material</Label>
                      <Input placeholder="Phylon, EVA, dll" {...register("midsoleMaterial")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Midsole Color</Label>
                      <Input placeholder="White, Black, dll" {...register("midsoleColor")} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Outsole Material</Label>
                      <Input placeholder="Rubber, TPU, dll" {...register("outsoleMaterial")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Outsole Color</Label>
                      <Input placeholder="White, Gum, dll" {...register("outsoleColor")} />
                    </div>
                  </div>

                  <div className="space-y-1.5 w-1/2 pr-2">
                    <Label className="text-xs font-medium">Bottom Treatment</Label>
                    <Controller
                      control={control}
                      name="bottomTreatment"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(val) => field.onChange(val === "none" || !val ? "" : String(val))}
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
                      )}
                    />
                  </div>
                </div>

                {/* Section: Status & PO */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">4. Status Pemesanan</p>
                    <div className="h-px bg-border" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/10">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Status Order</Label>
                      <p className="text-xs text-muted-foreground">
                        {watch("isOrdered") ? "✅ Sudah di-order" : "⏳ Belum di-order"}
                      </p>
                    </div>
                    <Controller
                      control={control}
                      name="isOrdered"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">No. PO</Label>
                      <Input placeholder="PO-2026-001" {...register("poNumber")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Supplier</Label>
                      <Input placeholder="Nama vendor" {...register("supplier")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ETA Date</Label>
                      <Input type="date" {...register("etaDate")} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Catatan / Keterangan</Label>
                    <Textarea
                      placeholder="Catatan tambahan (opsional)..."
                      {...register("notes")}
                      rows={2}
                    />
                  </div>
                </div>

              </div>
            )}

            <DialogFooter className="px-6 py-4 border-t bg-muted/10 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isPending || isLoadingBatch}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending || isLoadingBatch}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 w-32"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  editingBatchId ? "Simpan Perubahan" : "Simpan Matriks"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ FULL SCREEN IMAGE DIALOG ============ */}
      <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
        <DialogContent className="sm:max-w-3xl p-0 border-none bg-transparent shadow-none">
          <div className="relative w-full h-auto flex justify-center items-center">
            {fullScreenImage && (
              <img 
                src={fullScreenImage} 
                alt="Full preview" 
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl border-4 border-white dark:border-muted"
              />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute -top-4 -right-4 rounded-full h-10 w-10 shadow-lg"
              onClick={() => setIsImageOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE CONFIRMATION ============ */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Menghapus data ini akan menghilangkan <b>SELURUH UKURAN</b> di dalam PO ini secara permanen. Yakin ingin melanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Hapus Semua"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
