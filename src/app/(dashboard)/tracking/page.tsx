"use client"

import { useEffect, useState, useTransition, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import {
  getTrackingEntries,
  getModelNamesFromTooling,
  getBatchSizes,
  createTrackingEntry,
  updateTrackingEntry,
  deleteTrackingEntry,
  updateBatchOrder,
} from "@/app/actions/tracking"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  ShoppingCart, Search, Plus, Pencil, Trash2, Loader2,
  CheckCircle2, Clock, Package, X, ChevronDown, Check,
  ImageIcon, UploadCloud, GripVertical
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
        <span className="truncate">{value || "Select Model..."}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-2">
            <Input
              placeholder="Search model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground text-center">
                Model not found
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

// ============ Sortable Row Component ============
function SortableRow({
  entry,
  index,
  canManage,
  setFullScreenImage,
  setIsImageOpen,
  handleEdit,
  setDeletingId,
  setIsDeleteOpen,
}: {
  entry: TrackingEntryGrouped
  index: number
  canManage: boolean
  setFullScreenImage: (url: string | null) => void
  setIsImageOpen: (open: boolean) => void
  handleEdit: (entry: TrackingEntryGrouped) => void
  setDeletingId: (id: string) => void
  setIsDeleteOpen: (open: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.batchId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("group hover:bg-muted/30 transition-colors", isDragging && "bg-muted shadow-lg")}
    >
      <TableCell className="text-center text-muted-foreground text-xs w-[40px]">
        {canManage ? (
          <div {...attributes} {...listeners} className="cursor-grab hover:text-foreground flex justify-center text-muted-foreground focus:outline-none">
            <GripVertical className="h-4 w-4" />
          </div>
        ) : (
          index + 1
        )}
      </TableCell>
      <TableCell className="text-center p-2">
        {entry.imageUrl ? (
          <div 
            className="h-14 w-14 mx-auto rounded-md overflow-hidden border shadow-sm cursor-pointer hover:scale-110 transition-transform"
            onClick={() => {
              setFullScreenImage(entry.imageUrl)
              setIsImageOpen(true)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.imageUrl} alt={entry.article} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-14 w-14 mx-auto rounded-md bg-muted flex items-center justify-center border">
            <ImageIcon className="h-6 w-6 text-muted-foreground opacity-50" />
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
      <TableCell className="text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">M/S:</span>
            <span className="font-medium text-slate-700">
              {entry.midsoleMaterial || "-"} <br/> <span className="text-violet-600">({entry.midsoleColor || "-"})</span>
            </span>
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-slate-500 font-medium">O/S:</span>
            <span className="font-medium text-slate-700">
              {entry.outsoleMaterial || "-"} <br/> <span className="text-violet-600">({entry.outsoleColor || "-"})</span>
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center text-sm font-medium">
        {entry.bottomTreatment || "-"}
      </TableCell>
      <TableCell className="text-center font-mono font-semibold text-sm">
        <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 border-none">
          {entry.totalSizes} Sizes
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
      {canManage && (
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-violet-600 hover:bg-violet-500/10 transition-all"
              onClick={() => handleEdit(entry)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-all"
              onClick={() => {
                setDeletingId(entry.batchId)
                setIsDeleteOpen(true)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  )
}

// ============ Main Page ============

export default function TrackingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const role = session?.user?.role
  const permissions = session?.user?.permissions || []
  const isSuperAdmin = role === "SUPER_ADMIN"
  const canManage = isSuperAdmin || permissions.includes("MANAGE_TRACKING")
  const canView = isSuperAdmin || permissions.includes("VIEW_TRACKING") || permissions.includes("MANAGE_TRACKING")

  const [entries, setEntries] = useState<TrackingEntryGrouped[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
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
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const names = await getModelNamesFromTooling()
        setModelNames(names)
      } catch (error) {
        console.error("Failed to load model names", error)
      }
    }
    if (canView) {
      fetchModels()
    }
  }, [canView])

  useEffect(() => {
    if (session && !canView) {
      router.replace("/") // Redirect unauthorized users to dashboard
    }
  }, [session, canView, router])

  const fetchData = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    try {
      const result = await getTrackingEntries({
        search: debouncedSearch,
      })
      setEntries(result.entries as unknown as TrackingEntryGrouped[])
    } catch (error) {
      console.error("Failed to load tracking data", error)
      toast.error("Failed to load tracking data")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, currentPage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = entries.findIndex((e) => e.batchId === active.id)
    const newIndex = entries.findIndex((e) => e.batchId === over.id)

    const newEntries = arrayMove(entries, oldIndex, newIndex)
    setEntries(newEntries) // Optimistic update

    const orderedBatchIds = newEntries.map((e) => e.batchId)
    await updateBatchOrder(orderedBatchIds)
  }

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
      toast.error("Failed to load size details for this batch")
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
      toast.error("At least one size with quantity > 0 is required")
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
            <h1 className="text-xl font-bold tracking-tight">Purchase Tracking</h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} Purchase Orders registered
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            onClick={handleAdd}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search article, model, PO, supplier..."
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
                <TableHead className="font-semibold">Material / Color</TableHead>
                <TableHead className="font-semibold text-center">Treatment</TableHead>
                <TableHead className="font-semibold text-center">Size</TableHead>
                <TableHead className="font-semibold text-center">Total QTY</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold">PO / Supplier</TableHead>
                <TableHead className="font-semibold">ETA</TableHead>
                {canManage && <TableHead className="font-semibold text-center w-[90px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      <span className="text-sm text-muted-foreground">Loading data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Package className="h-10 w-10 opacity-30" />
                      <span className="text-sm">
                        {debouncedSearch ? "No matching data found" : "No PO / Order registered yet"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext items={entries.map(e => e.batchId)} strategy={verticalListSortingStrategy}>
                  {entries.map((entry, index) => (
                    <SortableRow
                      key={entry.batchId}
                      entry={entry}
                      index={index}
                      canManage={canManage}
                      setFullScreenImage={setFullScreenImage}
                      setIsImageOpen={setIsImageOpen}
                      handleEdit={handleEdit}
                      setDeletingId={setDeletingId}
                      setIsDeleteOpen={setIsDeleteOpen}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </DndContext>
          </Table>
        </div>
      </div>

      {/* ============ ADD / EDIT MATRIX DIALOG ============ */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b bg-muted/10 shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-violet-500" />
                {editingBatchId ? "Edit Order Matrix" : "Add Order Matrix"}
              </DialogTitle>
              <DialogDescription>
                Select the gender category, then enter the order quantities in the respective sizes.
              </DialogDescription>
            </DialogHeader>

            {isLoadingBatch ? (
              <div className="flex flex-col items-center justify-center p-12 gap-4 h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="text-sm text-muted-foreground">Loading matrix details...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
                
                {/* Section: Foto & Identitas */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">1. Photo & Identity</p>
                    <div className="h-px bg-border" />
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Foto Upload Zone */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Label className="text-xs font-medium">Shoe Photo</Label>
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
                          Remove Photo
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
                                <SelectValue placeholder="Category..." />
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
                    * Leave blank or enter &apos;0&apos; for sizes that are not ordered.
                  </p>
                </div>

                {/* Section: Spesifikasi Material */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">3. Material Specifications</p>
                    <div className="h-px bg-border" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Midsole Material</Label>
                      <Input placeholder="Phylon, EVA, etc." {...register("midsoleMaterial")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Midsole Color</Label>
                      <Input placeholder="White, Black, etc." {...register("midsoleColor")} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Outsole Material</Label>
                      <Input placeholder="Rubber, TPU, etc." {...register("outsoleMaterial")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Outsole Color</Label>
                      <Input placeholder="White, Gum, etc." {...register("outsoleColor")} />
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
                            <SelectValue placeholder="Select treatment..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
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
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">4. Order Status</p>
                    <div className="h-px bg-border" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/10">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Order Status</Label>
                      <p className="text-xs text-muted-foreground">
                        {watch("isOrdered") ? "✅ Ordered" : "⏳ Not Ordered"}
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
                      <Label className="text-xs font-medium">PO Number</Label>
                      <Input placeholder="PO-2026-001" {...register("poNumber")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Supplier</Label>
                      <Input placeholder="Vendor name" {...register("supplier")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">ETA Date</Label>
                      <Input type="date" {...register("etaDate")} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Notes / Remarks</Label>
                    <Textarea
                      placeholder="Additional notes (optional)..."
                      {...register("notes")}
                      rows={2}
                    />
                  </div>
                </div>

              </div>
            )}

            <DialogFooter className="px-6 py-4 border-t bg-muted/10 shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isPending || isLoadingBatch}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || isLoadingBatch}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 w-32"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  editingBatchId ? "Save Changes" : "Save Matrix"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE CONFIRMATION ============ */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this will permanently remove <b>ALL SIZES</b> within this PO. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
