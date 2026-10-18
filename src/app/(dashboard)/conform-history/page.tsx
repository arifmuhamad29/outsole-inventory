"use client"

import { useEffect, useState, useTransition, useCallback, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  Palette, Search, Plus, Pencil, Trash2, Loader2,
  CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw,
  History, UserCheck, Layers
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  getConformHistories,
  getConformTimelineByArticle,
  getArticlesFromTracking,
  createConformEntry,
  updateConformEntry,
  deleteConformEntry,
  ConformEntryInput,
} from "@/app/actions/conform"

interface ConformRecord {
  id: string
  article: string
  modelName: string | null
  submissionNo: number
  supplier: string | null
  projectDev: string
  requesterName: string | null
  confirmDate: Date | string
  status: string
  approvalDate: Date | string | null
  midsoleTargetColor: string | null
  midsoleSupplierColor: string | null
  midsoleSupplier: string | null
  midsoleStatus: string | null
  outsoleTargetColor: string | null
  outsoleSupplierColor: string | null
  outsoleSupplier: string | null
  outsoleStatus: string | null
  wedgeTargetColor: string | null
  wedgeSupplierColor: string | null
  wedgeSupplier: string | null
  wedgeStatus: string | null
  crTargetColor: string | null
  crSupplierColor: string | null
  crSupplier: string | null
  crStatus: string | null
  notes: string | null
  devFeedback: string | null
  imageUrl: string | null
  trackingBatchId: string | null
  createdAt: Date | string
}

interface TrackingArticleOption {
  batchId: string
  article: string
  modelName: string
  supplier: string | null
  midsoleColor: string | null
  outsoleColor: string | null
  wedgeColor: string | null
  crDeviceColor: string | null
  imageUrl: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock; bg: string }> = {
  PENDING: {
    label: "Pending PD Review",
    color: "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    color: "text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    icon: CheckCircle2,
  },
  APPROVED_WITH_NOTE: {
    label: "Approved w/ Note",
    color: "text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    icon: AlertCircle,
  },
  REJECTED: {
    label: "Rejected / Revise",
    color: "text-red-700 dark:text-red-400 border-red-300 dark:border-red-800",
    bg: "bg-red-50 dark:bg-red-950/40",
    icon: XCircle,
  },
}

function ConformHistoryContent() {
  const searchParams = useSearchParams()
  const initialArticle = searchParams?.get("article") || ""

  const { data: session } = useSession()
  const role = session?.user?.role
  const permissions = session?.user?.permissions || []
  const canManage = role === "SUPER_ADMIN" || permissions.includes("MANAGE_TRACKING") || role === "ADMIN"

  const [entries, setEntries] = useState<ConformRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialArticle)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [trackingArticles, setTrackingArticles] = useState<TrackingArticleOption[]>([])

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  const [selectedEntry, setSelectedEntry] = useState<ConformRecord | null>(null)
  const [timelineEntries, setTimelineEntries] = useState<ConformRecord[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [selectedArticleForTimeline, setSelectedArticleForTimeline] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Searchable article picker states
  const [isArticlePickerOpen, setIsArticlePickerOpen] = useState(false)
  const [articleSearchQuery, setArticleSearchQuery] = useState("")

  const [isPending, startTransition] = useTransition()

  // Form State
  const [formData, setFormData] = useState<ConformEntryInput>({
    article: "",
    modelName: "",
    supplier: "",
    projectDev: "",
    requesterName: "",
    status: "PENDING",
    midsoleTargetColor: "",
    midsoleSupplierColor: "",
    midsoleSupplier: "",
    midsoleStatus: "PENDING",
    outsoleTargetColor: "",
    outsoleSupplierColor: "",
    outsoleSupplier: "",
    outsoleStatus: "PENDING",
    wedgeTargetColor: "",
    wedgeSupplierColor: "",
    wedgeSupplier: "",
    wedgeStatus: "PENDING",
    crTargetColor: "",
    crSupplierColor: "",
    crSupplier: "",
    crStatus: "PENDING",
    notes: "",
    devFeedback: "",
  })

  // Review Dialog State
  const [reviewStatus, setReviewStatus] = useState("APPROVED")
  const [reviewFeedback, setReviewFeedback] = useState("")
  const [reviewProjectDev, setReviewProjectDev] = useState("")
  const [reviewCompStatus, setReviewCompStatus] = useState({
    midsole: "APPROVED",
    outsole: "APPROVED",
    wedge: "APPROVED",
    cr: "APPROVED"
  })

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getConformHistories({
        search: searchQuery,
        status: statusFilter,
      })
      setEntries(res.entries as unknown as ConformRecord[])
      setStats(res.stats)
    } catch (err) {
      console.error(err)
      toast.error("Gagal memuat data conform history")
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter])

  // Load tracking articles for dropdown
  useEffect(() => {
    async function loadTrackingArticles() {
      try {
        const data = await getArticlesFromTracking()
        setTrackingArticles(data as unknown as TrackingArticleOption[])
      } catch (err) {
        console.error("Gagal memuat daftar artikel tracking", err)
      }
    }
    loadTrackingArticles()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchData])

  // Open Form for New Conform
  const handleOpenNew = (prefill?: Partial<ConformEntryInput>) => {
    setSelectedEntry(null)
    setIsArticlePickerOpen(!prefill?.article)
    setArticleSearchQuery("")
    setFormData({
      article: prefill?.article || "",
      modelName: prefill?.modelName || "",
      supplier: prefill?.supplier || "",
      projectDev: prefill?.projectDev || "",
      requesterName: session?.user?.name || "Operator",
      status: "PENDING",
      midsoleTargetColor: prefill?.midsoleTargetColor || "",
      midsoleSupplierColor: prefill?.midsoleSupplierColor || "",
      midsoleSupplier: prefill?.midsoleSupplier || prefill?.supplier || "",
      midsoleStatus: "PENDING",
      outsoleTargetColor: prefill?.outsoleTargetColor || "",
      outsoleSupplierColor: prefill?.outsoleSupplierColor || "",
      outsoleSupplier: prefill?.outsoleSupplier || prefill?.supplier || "",
      outsoleStatus: "PENDING",
      wedgeTargetColor: prefill?.wedgeTargetColor || "",
      wedgeSupplierColor: prefill?.wedgeSupplierColor || "",
      wedgeSupplier: prefill?.wedgeSupplier || prefill?.supplier || "",
      wedgeStatus: "PENDING",
      crTargetColor: prefill?.crTargetColor || "",
      crSupplierColor: prefill?.crSupplierColor || "",
      crSupplier: prefill?.crSupplier || prefill?.supplier || "",
      crStatus: "PENDING",
      notes: prefill?.notes || "",
      devFeedback: "",
      trackingBatchId: prefill?.trackingBatchId || "",
    })
    setIsFormOpen(true)
  }

  // Open Form to Edit
  const handleOpenEdit = (entry: ConformRecord) => {
    setSelectedEntry(entry)
    setIsArticlePickerOpen(false)
    setArticleSearchQuery("")
    setFormData({
      article: entry.article,
      modelName: entry.modelName || "",
      supplier: entry.supplier || "",
      projectDev: entry.projectDev,
      requesterName: entry.requesterName || "",
      status: entry.status,
      midsoleTargetColor: entry.midsoleTargetColor || "",
      midsoleSupplierColor: entry.midsoleSupplierColor || "",
      midsoleSupplier: entry.midsoleSupplier || "",
      midsoleStatus: entry.midsoleStatus || "PENDING",
      outsoleTargetColor: entry.outsoleTargetColor || "",
      outsoleSupplierColor: entry.outsoleSupplierColor || "",
      outsoleSupplier: entry.outsoleSupplier || "",
      outsoleStatus: entry.outsoleStatus || "PENDING",
      wedgeTargetColor: entry.wedgeTargetColor || "",
      wedgeSupplierColor: entry.wedgeSupplierColor || "",
      wedgeSupplier: entry.wedgeSupplier || "",
      wedgeStatus: entry.wedgeStatus || "PENDING",
      crTargetColor: entry.crTargetColor || "",
      crSupplierColor: entry.crSupplierColor || "",
      crSupplier: entry.crSupplier || "",
      crStatus: entry.crStatus || "PENDING",
      notes: entry.notes || "",
      devFeedback: entry.devFeedback || "",
    })
    setIsFormOpen(true)
  }

  // Handle article selection from dropdown: auto fill colors & model
  const handleSelectTrackingArticle = (articleVal: string | null) => {
    if (!articleVal) return
    const found = trackingArticles.find(a => a.article === articleVal)
    if (found) {
      setFormData(prev => ({
        ...prev,
        article: found.article,
        modelName: found.modelName,
        supplier: found.supplier || prev.supplier,
        midsoleTargetColor: found.midsoleColor || "",
        midsoleSupplier: found.supplier || prev.midsoleSupplier || "",
        outsoleTargetColor: found.outsoleColor || "",
        outsoleSupplier: found.supplier || prev.outsoleSupplier || "",
        wedgeTargetColor: found.wedgeColor || "",
        wedgeSupplier: found.supplier || prev.wedgeSupplier || "",
        crTargetColor: found.crDeviceColor || "",
        crSupplier: found.supplier || prev.crSupplier || "",
        trackingBatchId: found.batchId,
      }))
      setIsArticlePickerOpen(false)
    }
  }

  const filteredTrackingArticles = trackingArticles.filter((item) => {
    if (!articleSearchQuery.trim()) return true
    const query = articleSearchQuery.toLowerCase()
    return (
      item.article.toLowerCase().includes(query) ||
      item.modelName.toLowerCase().includes(query) ||
      (item.supplier && item.supplier.toLowerCase().includes(query))
    )
  })

  // Save (Create or Update)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.article.trim()) {
      toast.error("Kode artikel wajib diisi")
      return
    }
    if (!formData.projectDev.trim()) {
      toast.error("Nama Team Project Developer wajib diisi")
      return
    }

    startTransition(async () => {
      try {
        if (selectedEntry) {
          const res = await updateConformEntry(selectedEntry.id, formData)
          if (res.success) {
            toast.success(res.message)
            setIsFormOpen(false)
            fetchData()
          }
        } else {
          const res = await createConformEntry(formData)
          if (res.success) {
            toast.success(res.message)
            setIsFormOpen(false)
            fetchData()
          }
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan data")
      }
    })
  }

  // Open Review Dialog (for PD Decision)
  const handleOpenReview = (entry: ConformRecord) => {
    setSelectedEntry(entry)
    setReviewStatus(entry.status === "PENDING" ? "APPROVED" : entry.status)
    setReviewFeedback(entry.devFeedback || "")
    setReviewProjectDev(entry.projectDev)
    setReviewCompStatus({
      midsole: entry.midsoleStatus || "APPROVED",
      outsole: entry.outsoleStatus || "APPROVED",
      wedge: entry.wedgeStatus || "APPROVED",
      cr: entry.crStatus || "APPROVED"
    })
    setIsReviewOpen(true)
  }

  const handleSubmitReview = () => {
    if (!selectedEntry) return
    startTransition(async () => {
      try {
        const res = await updateConformEntry(selectedEntry.id, {
          status: reviewStatus,
          projectDev: reviewProjectDev,
          devFeedback: reviewFeedback,
          midsoleStatus: reviewCompStatus.midsole,
          outsoleStatus: reviewCompStatus.outsole,
          wedgeStatus: reviewCompStatus.wedge,
          crStatus: reviewCompStatus.cr,
        })
        if (res.success) {
          toast.success(res.message)
          setIsReviewOpen(false)
          fetchData()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan keputusan review")
      }
    })
  }

  // Open Timeline History for an Article
  const handleOpenTimeline = async (article: string) => {
    setSelectedArticleForTimeline(article)
    setIsTimelineOpen(true)
    setTimelineLoading(true)
    try {
      const history = await getConformTimelineByArticle(article)
      setTimelineEntries(history as unknown as ConformRecord[])
    } catch (err) {
      console.error(err)
      toast.error("Gagal memuat riwayat timeline")
    } finally {
      setTimelineLoading(false)
    }
  }

  // Submit Next Round (e.g. 2nd / 3rd conform when rejected)
  const handleNextRound = (entry: ConformRecord) => {
    handleOpenNew({
      article: entry.article,
      modelName: entry.modelName || "",
      supplier: entry.supplier || "",
      projectDev: entry.projectDev,
      midsoleTargetColor: entry.midsoleTargetColor || "",
      midsoleSupplierColor: entry.midsoleSupplierColor || "",
      midsoleSupplier: entry.midsoleSupplier || "",
      outsoleTargetColor: entry.outsoleTargetColor || "",
      outsoleSupplierColor: entry.outsoleSupplierColor || "",
      outsoleSupplier: entry.outsoleSupplier || "",
      wedgeTargetColor: entry.wedgeTargetColor || "",
      wedgeSupplierColor: entry.wedgeSupplierColor || "",
      wedgeSupplier: entry.wedgeSupplier || "",
      crTargetColor: entry.crTargetColor || "",
      crSupplierColor: entry.crSupplierColor || "",
      crSupplier: entry.crSupplier || "",
      notes: `Resubmission / Conform ulang setelah Submission #${entry.submissionNo}`,
      trackingBatchId: entry.trackingBatchId || "",
    })
  }

  // Delete
  const handleDelete = () => {
    if (!deletingId) return
    startTransition(async () => {
      try {
        const res = await deleteConformEntry(deletingId)
        if (res.success) {
          toast.success(res.message)
          setIsDeleteOpen(false)
          setDeletingId(null)
          fetchData()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal menghapus data")
      }
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Color Conform History</h1>
            <p className="text-sm text-muted-foreground">
              Riwayat konfirmasi warna komponen (Midsole, Outsole, Wedge, CR) ke Team Project Developer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {canManage && (
            <Button
              onClick={() => handleOpenNew()}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25 gap-2"
            >
              <Plus className="h-4 w-4" />
              New Color Conform
            </Button>
          )}
        </div>
      </div>

      {/* METRICS STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Conforms
            </CardTitle>
            <Layers className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total submission tercatat</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">{stats.pending}</div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">Menunggu respon PD</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Approved
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{stats.approved}</div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Disetujui Project Dev</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
              Rejected / Revise
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900 dark:text-red-200">{stats.rejected}</div>
            <p className="text-[11px] text-red-700/80 dark:text-red-400/80 mt-0.5">Perlu pengajuan ulang</p>
          </CardContent>
        </Card>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari Article, Model, Project Dev, Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0 hidden sm:inline">Status:</Label>
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="PENDING">Pending PD</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="APPROVED_WITH_NOTE">Approved w/ Note</SelectItem>
              <SelectItem value="REJECTED">Rejected / Revise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[110px]">Tgl / Submission</TableHead>
              <TableHead className="min-w-[150px]">Article &amp; Model</TableHead>
              <TableHead className="min-w-[340px]">Rincian Warna Komponen (Target vs Supplier)</TableHead>
              <TableHead className="min-w-[160px]">Project Developer</TableHead>
              <TableHead className="w-[150px] text-center">Status Decision</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    <span className="text-xs text-muted-foreground">Memuat data conform history...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Palette className="h-8 w-8 stroke-1 text-slate-400" />
                    <p className="font-medium text-sm">Belum ada riwayat conform color.</p>
                    <p className="text-xs">Klik tombol &quot;New Color Conform&quot; untuk menambahkan konfirmasi warna baru.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.PENDING
                const StatusIcon = statusCfg.icon

                return (
                  <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors">
                    {/* TGL & SUBMISSION NO */}
                    <TableCell className="align-top py-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-foreground">
                          {format(new Date(entry.confirmDate), "dd MMM yyyy", { locale: localeId })}
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-mono text-[10px] px-1.5 py-0 rounded font-bold",
                            entry.submissionNo > 1 
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700" 
                              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          )}
                        >
                          {entry.submissionNo === 1 ? "1st Conform" : `${entry.submissionNo}th Conform`}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* ARTICLE & MODEL */}
                    <TableCell className="align-top py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-sm text-foreground bg-primary/10 text-primary px-1.5 py-0.2 rounded border border-primary/20">
                            {entry.article}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">
                          {entry.modelName || "-"}
                        </div>
                        {entry.supplier && entry.supplier !== "-" && (
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400">
                            Supplier: {entry.supplier}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenTimeline(entry.article)}
                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-indigo-600 gap-1 -ml-1 mt-0.5"
                        >
                          <History className="h-3 w-3" />
                          View History
                        </Button>
                      </div>
                    </TableCell>

                    {/* 4 COMPONENTS DETAIL */}
                    <TableCell className="align-top py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        {/* MIDSOLE */}
                        <div className="p-2 rounded-md bg-muted/30 border border-slate-100 dark:border-slate-800 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">MID (Midsole):</span>
                            {renderCompBadge(entry.midsoleStatus)}
                          </div>
                          <div className="text-[11px] leading-tight text-muted-foreground">
                            Target: <span className="font-medium text-foreground">{entry.midsoleTargetColor || "-"}</span>
                          </div>
                          <div className="text-[11px] leading-tight text-muted-foreground">
                            Supplier: <span className={cn(
                              "font-semibold",
                              entry.midsoleSupplierColor && entry.midsoleSupplierColor !== entry.midsoleTargetColor 
                                ? "text-amber-700 dark:text-amber-300" 
                                : "text-foreground"
                            )}>
                              {entry.midsoleSupplierColor || <span className="opacity-50 italic">Sama dg target</span>}
                            </span>
                          </div>
                          {entry.midsoleSupplier && (
                            <div className="text-[11px] leading-tight text-indigo-600 dark:text-indigo-400 font-medium">
                              Vendor: <span>{entry.midsoleSupplier}</span>
                            </div>
                          )}
                        </div>

                        {/* OUTSOLE */}
                        <div className="p-2 rounded-md bg-muted/30 border border-slate-100 dark:border-slate-800 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">OUT (Outsole):</span>
                            {renderCompBadge(entry.outsoleStatus)}
                          </div>
                          <div className="text-[11px] leading-tight text-muted-foreground">
                            Target: <span className="font-medium text-foreground">{entry.outsoleTargetColor || "-"}</span>
                          </div>
                          <div className="text-[11px] leading-tight text-muted-foreground">
                            Supplier: <span className={cn(
                              "font-semibold",
                              entry.outsoleSupplierColor && entry.outsoleSupplierColor !== entry.outsoleTargetColor 
                                ? "text-amber-700 dark:text-amber-300" 
                                : "text-foreground"
                            )}>
                              {entry.outsoleSupplierColor || <span className="opacity-50 italic">Sama dg target</span>}
                            </span>
                          </div>
                          {entry.outsoleSupplier && (
                            <div className="text-[11px] leading-tight text-indigo-600 dark:text-indigo-400 font-medium">
                              Vendor: <span>{entry.outsoleSupplier}</span>
                            </div>
                          )}
                        </div>

                        {/* WEDGE */}
                        {(entry.wedgeTargetColor || entry.wedgeSupplierColor || entry.wedgeSupplier) && (
                          <div className="p-2 rounded-md bg-muted/30 border border-slate-100 dark:border-slate-800 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">WDG (Wedge):</span>
                              {renderCompBadge(entry.wedgeStatus)}
                            </div>
                            <div className="text-[11px] leading-tight text-muted-foreground">
                              Target: <span className="font-medium text-foreground">{entry.wedgeTargetColor || "-"}</span>
                            </div>
                            <div className="text-[11px] leading-tight text-muted-foreground">
                              Supplier: <span className={cn(
                                "font-semibold",
                                entry.wedgeSupplierColor && entry.wedgeSupplierColor !== entry.wedgeTargetColor 
                                  ? "text-amber-700 dark:text-amber-300" 
                                  : "text-foreground"
                              )}>
                                {entry.wedgeSupplierColor || <span className="opacity-50 italic">Sama dg target</span>}
                              </span>
                            </div>
                            {entry.wedgeSupplier && (
                              <div className="text-[11px] leading-tight text-indigo-600 dark:text-indigo-400 font-medium">
                                Vendor: <span>{entry.wedgeSupplier}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* CR DEVICE */}
                        {(entry.crTargetColor || entry.crSupplierColor || entry.crSupplier) && (
                          <div className="p-2 rounded-md bg-muted/30 border border-slate-100 dark:border-slate-800 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">CR (Device):</span>
                              {renderCompBadge(entry.crStatus)}
                            </div>
                            <div className="text-[11px] leading-tight text-muted-foreground">
                              Target: <span className="font-medium text-foreground">{entry.crTargetColor || "-"}</span>
                            </div>
                            <div className="text-[11px] leading-tight text-muted-foreground">
                              Supplier: <span className={cn(
                                "font-semibold",
                                entry.crSupplierColor && entry.crSupplierColor !== entry.crTargetColor 
                                  ? "text-amber-700 dark:text-amber-300" 
                                  : "text-foreground"
                              )}>
                                {entry.crSupplierColor || <span className="opacity-50 italic">Sama dg target</span>}
                              </span>
                            </div>
                            {entry.crSupplier && (
                              <div className="text-[11px] leading-tight text-indigo-600 dark:text-indigo-400 font-medium">
                                Vendor: <span>{entry.crSupplier}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {entry.notes && (
                        <div className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Notes Pemohon: </span>
                          {entry.notes}
                        </div>
                      )}
                    </TableCell>

                    {/* PROJECT DEVELOPER & FEEDBACK */}
                    <TableCell className="align-top py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 font-semibold text-xs text-foreground">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span>{entry.projectDev}</span>
                        </div>
                        {entry.approvalDate && (
                          <div className="text-[10px] text-muted-foreground">
                            Decision: {format(new Date(entry.approvalDate), "dd MMM yyyy", { locale: localeId })}
                          </div>
                        )}
                        {entry.devFeedback ? (
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-indigo-50/50 dark:bg-indigo-950/30 p-1.5 rounded border border-indigo-100 dark:border-indigo-900/40 mt-1">
                            <span className="font-semibold text-indigo-900 dark:text-indigo-300">PD Feedback: </span>
                            {entry.devFeedback}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic">
                            Belum ada feedback
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* STATUS DECISION */}
                    <TableCell className="align-top py-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn("px-2.5 py-1 text-xs font-semibold gap-1.5 border shadow-sm", statusCfg.color, statusCfg.bg)}
                        >
                          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{statusCfg.label}</span>
                        </Badge>

                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReview(entry)}
                            className="h-7 text-[11px] px-2 gap-1 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300"
                          >
                            <UserCheck className="h-3 w-3" />
                            Review PD
                          </Button>
                        )}
                      </div>
                    </TableCell>

                    {/* ACTIONS */}
                    <TableCell className="align-top py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Next Round Button if Rejected or needs follow up */}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ajukan Conform Ulang (Next Round)"
                            onClick={() => handleNextRound(entry)}
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}

                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Edit Data Conform"
                            onClick={() => handleOpenEdit(entry)}
                            className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 dark:border-indigo-800 gap-1.5 shadow-xs font-medium"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>
                        )}

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus"
                            onClick={() => {
                              setDeletingId(entry.id)
                              setIsDeleteOpen(true)
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ======================================================== */}
      {/* 1. ADD / EDIT CONFORM DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              {selectedEntry ? "Edit Color Conform" : "New Color Conform Submission"}
            </DialogTitle>
            <DialogDescription>
              Catat pengajuan konfirmasi warna komponen outsole/bottom ke Team Project Developer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            {/* ARTICLE TRACKING PICKER (SEARCHABLE & AUTOFILL) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Article Tracking <span className="text-red-500">*</span></span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  (Pilih dari artikel terdaftar di Purchase Tracking)
                </span>
              </Label>

              {/* CARD INFO JIKA ARTIKEL SUDAH DIPILIH */}
              {formData.article && !isArticlePickerOpen ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs shadow-sm">
                      ART
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-foreground">
                          {formData.article}
                        </span>
                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          {formData.modelName || "-"}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Supplier: <strong className="text-foreground">{formData.supplier || "-"}</strong>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsArticlePickerOpen(true)
                      setArticleSearchQuery("")
                    }}
                    className="h-8 text-xs border-indigo-200 hover:bg-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 gap-1.5"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Ganti Article
                  </Button>
                </div>
              ) : (
                /* SEARCHABLE ARTICLE PICKER BOX */
                <div className="space-y-2 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari kode article (misal: P57472N) atau nama model..."
                      value={articleSearchQuery}
                      onChange={(e) => setArticleSearchQuery(e.target.value)}
                      className="pl-9 bg-background font-medium"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {filteredTrackingArticles.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        Tidak ada article yang cocok di Purchase Tracking.
                      </div>
                    ) : (
                      filteredTrackingArticles.map((item) => {
                        const isSelected = formData.article === item.article
                        return (
                          <div
                            key={item.article}
                            onClick={() => handleSelectTrackingArticle(item.article)}
                            className={cn(
                              "p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 text-xs",
                              isSelected
                                ? "bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 shadow-sm"
                                : "bg-background hover:bg-muted/60 border-slate-200 dark:border-slate-800"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-foreground bg-primary/10 text-primary px-1.5 py-0.2 rounded border border-primary/20">
                                  {item.article}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {item.modelName}
                                </span>
                              </div>
                              {item.supplier && (
                                <span className="text-[11px] text-muted-foreground">
                                  {item.supplier}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
                              {item.midsoleColor && <span>MID: <strong className="text-foreground">{item.midsoleColor}</strong></span>}
                              {item.outsoleColor && <span>OUT: <strong className="text-foreground">{item.outsoleColor}</strong></span>}
                              {item.wedgeColor && <span>WDG: <strong className="text-foreground">{item.wedgeColor}</strong></span>}
                              {item.crDeviceColor && <span>CR: <strong className="text-foreground">{item.crDeviceColor}</strong></span>}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {formData.article && isArticlePickerOpen && (
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsArticlePickerOpen(false)}
                        className="h-7 text-xs"
                      >
                        Batal
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DEVELOPER & PEMOHON */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Team Project Developer <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nama Developer (e.g. Arif PD)"
                  value={formData.projectDev}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectDev: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pemohon (Requester)</Label>
                <Input
                  placeholder="Nama pengaju"
                  value={formData.requesterName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, requesterName: e.target.value }))}
                />
              </div>
            </div>

            {/* 4 BOTTOM COMPONENTS SPECIFICATION & ACTUAL COLOR */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Detail Warna 4 Komponen Bottom
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/20">
                {/* 1. MIDSOLE */}
                <div className="p-3 rounded-md bg-background border space-y-2">
                  <span className="font-bold text-xs text-foreground block border-b pb-1">
                    1. Midsole (MID)
                  </span>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Target Color (Standar PO)</Label>
                    <Input
                      placeholder="e.g. SEA SALT"
                      value={formData.midsoleTargetColor || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, midsoleTargetColor: e.target.value }))}
                      className="h-8 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                      Supplier Actual Color (Warna Sampel)
                    </Label>
                    <Input
                      placeholder="Warna dari supplier jika ada beda"
                      value={formData.midsoleSupplierColor || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, midsoleSupplierColor: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold">
                      Vendor / Supplier Midsole
                    </Label>
                    <Input
                      placeholder="Contoh: Pou Chen, Feng Tay"
                      value={formData.midsoleSupplier || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, midsoleSupplier: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* 2. OUTSOLE */}
                <div className="p-3 rounded-md bg-background border space-y-2">
                  <span className="font-bold text-xs text-foreground block border-b pb-1">
                    2. Outsole (OUT)
                  </span>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Target Color (Standar PO)</Label>
                    <Input
                      placeholder="e.g. BLACK"
                      value={formData.outsoleTargetColor || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, outsoleTargetColor: e.target.value }))}
                      className="h-8 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                      Supplier Actual Color (Warna Sampel)
                    </Label>
                    <Input
                      placeholder="Warna dari supplier jika ada beda"
                      value={formData.outsoleSupplierColor || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, outsoleSupplierColor: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold">
                      Vendor / Supplier Outsole
                    </Label>
                    <Input
                      placeholder="Contoh: Pou Chen, Feng Tay"
                      value={formData.outsoleSupplier || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, outsoleSupplier: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* 3. WEDGE */}
                <div className="p-3 rounded-md bg-background border space-y-2">
                  <span className="font-bold text-xs text-foreground block border-b pb-1">
                    3. Wedge (WDG)
                  </span>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Target Color (Standar PO)</Label>
                    <Input
                      placeholder="e.g. SEA GLASES"
                      value={formData.wedgeTargetColor || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, wedgeTargetColor: e.target.value }))}
                      className="h-8 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                      Supplier Actual Color (Warna Sampel)
                    </Label>
                    <Input
                      placeholder="Warna dari supplier jika ada beda"
                      value={formData.wedgeSupplierColor || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, wedgeSupplierColor: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold">
                      Vendor / Supplier Wedge
                    </Label>
                    <Input
                      placeholder="Contoh: Pou Chen, Feng Tay"
                      value={formData.wedgeSupplier || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, wedgeSupplier: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* 4. CR DEVICE */}
                <div className="p-3 rounded-md bg-background border space-y-2">
                  <span className="font-bold text-xs text-foreground block border-b pb-1">
                    4. CR Device (CR)
                  </span>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Target Color (Standar PO)</Label>
                    <Input
                      placeholder="e.g. SEA GLASES"
                      value={formData.crTargetColor || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, crTargetColor: e.target.value }))}
                      className="h-8 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                      Supplier Actual Color (Warna Sampel)
                    </Label>
                    <Input
                      placeholder="Warna dari supplier jika ada beda"
                      value={formData.crSupplierColor || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, crSupplierColor: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold">
                      Vendor / Supplier CR Device
                    </Label>
                    <Input
                      placeholder="Contoh: Pou Chen, Feng Tay"
                      value={formData.crSupplier || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, crSupplier: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* NOTES */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan / Alasan Konfirmasi</Label>
              <Textarea
                placeholder="Contoh: Warna Sea Salt dari supplier agak kehijauan / ada sedikit deviasi shade, mohon dicek apakah acceptable untuk trial..."
                rows={2}
                value={formData.notes || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedEntry ? "Simpan Perubahan" : "Submit Konfirmasi Warna"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 2. REVIEW & DECISION MODAL (PD APPROVAL) */}
      {/* ======================================================== */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Keputusan Project Developer
            </DialogTitle>
            <DialogDescription>
              Isi persetujuan atau catatan keputusan konfirmasi warna untuk artikel{" "}
              <span className="font-mono font-bold text-foreground">{selectedEntry?.article}</span>{" "}
              (Submission #{selectedEntry?.submissionNo}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Developer In Charge</Label>
              <Input
                value={reviewProjectDev}
                onChange={(e) => setReviewProjectDev(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Persetujuan Akhir</Label>
              <Select value={reviewStatus} onValueChange={(val) => { if (val) setReviewStatus(val) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">✅ APPROVED (Disetujui / OK to Proceed)</SelectItem>
                  <SelectItem value="APPROVED_WITH_NOTE">ℹ️ APPROVED WITH NOTE (Disetujui Bersyarat / Catatan)</SelectItem>
                  <SelectItem value="REJECTED">❌ REJECTED / REVISE (Ditolak / Minta Kirim Ulang)</SelectItem>
                  <SelectItem value="PENDING">⏳ PENDING (Masih Menunggu Evaluasi)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Per Component Quick Status */}
            <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
              <Label className="text-xs font-bold">Status Tiap Komponen:</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    Midsole {selectedEntry?.midsoleSupplier ? `(${selectedEntry.midsoleSupplier})` : ""}:
                  </span>
                  <Select 
                    value={reviewCompStatus.midsole} 
                    onValueChange={(val) => { if (val) setReviewCompStatus(prev => ({ ...prev, midsole: val })) }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    Outsole {selectedEntry?.outsoleSupplier ? `(${selectedEntry.outsoleSupplier})` : ""}:
                  </span>
                  <Select 
                    value={reviewCompStatus.outsole} 
                    onValueChange={(val) => { if (val) setReviewCompStatus(prev => ({ ...prev, outsole: val })) }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    Wedge {selectedEntry?.wedgeSupplier ? `(${selectedEntry.wedgeSupplier})` : ""}:
                  </span>
                  <Select 
                    value={reviewCompStatus.wedge} 
                    onValueChange={(val) => { if (val) setReviewCompStatus(prev => ({ ...prev, wedge: val })) }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block truncate">
                    CR Device {selectedEntry?.crSupplier ? `(${selectedEntry.crSupplier})` : ""}:
                  </span>
                  <Select 
                    value={reviewCompStatus.cr} 
                    onValueChange={(val) => { if (val) setReviewCompStatus(prev => ({ ...prev, cr: val })) }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Feedback / Komentar Developer</Label>
              <Textarea
                placeholder="Contoh: Warna Sea Salt acceptable untuk trial S2. Untuk produksi massal harap sesuaikan lab dip agar lebih sesuai standar."
                rows={3}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitReview} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Keputusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 3. TIMELINE HISTORY MODAL (RIWAYAT BERULANG PER ARTIKEL) */}
      {/* ======================================================== */}
      <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              Timeline Riwayat Conform: <span className="font-mono text-primary">{selectedArticleForTimeline}</span>
            </DialogTitle>
            <DialogDescription>
              Seluruh riwayat pengajuan konfirmasi warna untuk artikel ini dari awal hingga akhir.
            </DialogDescription>
          </DialogHeader>

          {timelineLoading ? (
            <div className="flex flex-col items-center justify-center p-8 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <p className="text-xs text-muted-foreground">Memuat urutan riwayat...</p>
            </div>
          ) : timelineEntries.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Tidak ada riwayat ditemukan.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200 dark:before:bg-indigo-900/60 pt-2">
              {timelineEntries.map((item) => {
                const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING
                const StatusIcon = statusCfg.icon

                return (
                  <div key={item.id} className="relative">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[29px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-indigo-500 shadow-sm">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {item.submissionNo}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-card space-y-2 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            Submission #{item.submissionNo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {format(new Date(item.confirmDate), "dd MMM yyyy", { locale: localeId })}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[11px] font-semibold gap-1 px-2 py-0.5", statusCfg.color, statusCfg.bg)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {/* Components summary */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2 rounded">
                        <div className="space-y-0.5">
                          <div>
                            <span className="text-muted-foreground font-medium">MID: </span>
                            <span className="text-foreground">{item.midsoleTargetColor || "-"}</span>
                            {item.midsoleSupplierColor && (
                              <span className="text-amber-700 dark:text-amber-300 font-semibold"> (Spl: {item.midsoleSupplierColor})</span>
                            )}
                          </div>
                          {item.midsoleSupplier && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              Vendor: {item.midsoleSupplier}
                            </div>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div>
                            <span className="text-muted-foreground font-medium">OUT: </span>
                            <span className="text-foreground">{item.outsoleTargetColor || "-"}</span>
                            {item.outsoleSupplierColor && (
                              <span className="text-amber-700 dark:text-amber-300 font-semibold"> (Spl: {item.outsoleSupplierColor})</span>
                            )}
                          </div>
                          {item.outsoleSupplier && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              Vendor: {item.outsoleSupplier}
                            </div>
                          )}
                        </div>
                        {(item.wedgeTargetColor || item.wedgeSupplierColor || item.wedgeSupplier) && (
                          <div className="space-y-0.5">
                            <div>
                              <span className="text-muted-foreground font-medium">WDG: </span>
                              <span className="text-foreground">{item.wedgeTargetColor || "-"}</span>
                              {item.wedgeSupplierColor && (
                                <span className="text-amber-700 dark:text-amber-300 font-semibold"> (Spl: {item.wedgeSupplierColor})</span>
                              )}
                            </div>
                            {item.wedgeSupplier && (
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                Vendor: {item.wedgeSupplier}
                              </div>
                            )}
                          </div>
                        )}
                        {(item.crTargetColor || item.crSupplierColor || item.crSupplier) && (
                          <div className="space-y-0.5">
                            <div>
                              <span className="text-muted-foreground font-medium">CR: </span>
                              <span className="text-foreground">{item.crTargetColor || "-"}</span>
                              {item.crSupplierColor && (
                                <span className="text-amber-700 dark:text-amber-300 font-semibold"> (Spl: {item.crSupplierColor})</span>
                              )}
                            </div>
                            {item.crSupplier && (
                              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                Vendor: {item.crSupplier}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {item.notes && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Catatan Pemohon: </span>
                          {item.notes}
                        </div>
                      )}

                      {item.devFeedback && (
                        <div className="text-xs text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded border border-indigo-200 dark:border-indigo-800">
                          <span className="font-bold">Feedback {item.projectDev}: </span>
                          {item.devFeedback}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsTimelineOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 4. DELETE CONFIRMATION DIALOG */}
      {/* ======================================================== */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Conform History?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Riwayat konfirmasi warna ini akan dihapus permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Helper to render component status badge
function renderCompBadge(status: string | null) {
  if (!status || status === "PENDING") {
    return <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">⏳ Pending</span>
  }
  if (status === "APPROVED") {
    return <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">✅ OK</span>
  }
  if (status === "REJECTED") {
    return <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">❌ Revise</span>
  }
  return <span className="text-[10px] text-muted-foreground">-</span>
}

export default function ConformHistoryPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 gap-3 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-muted-foreground">Memuat Conform History...</p>
      </div>
    }>
      <ConformHistoryContent />
    </Suspense>
  )
}
