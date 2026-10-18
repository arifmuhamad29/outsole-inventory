"use client"

import { useEffect, useState, useTransition, useCallback, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  Palette, Search, Plus, Pencil, Trash2, Loader2,
  CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw,
  UserCheck, Layers, ChevronRight, ExternalLink,
  Calendar, Building2, Send, ArrowRight, ShieldAlert, Sparkles, Filter, X
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
import { Progress } from "@/components/ui/progress"
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
  getGroupedConformArticles,
  getArticleConformDetails,
  submitComponentCfmRound,
  reviewComponentCfmRound,
  deleteConformEntry,
  getArticlesFromTracking,
  updateArticleDevAndSupplier,
  ArticleConformSummary,
  ComponentStatusSummary,
} from "@/app/actions/conform"

const COMPONENT_CONFIG = {
  MIDSOLE: {
    key: "MIDSOLE" as const,
    label: "Midsole",
    short: "MID",
    dotColor: null,
    iconBg: "bg-sky-600",
    color: "from-sky-500 to-blue-600",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  OUTSOLE: {
    key: "OUTSOLE" as const,
    label: "Outsole",
    short: "OUT",
    dotColor: null,
    iconBg: "bg-indigo-600",
    color: "from-indigo-500 to-violet-600",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  WEDGE: {
    key: "WEDGE" as const,
    label: "Wedge",
    short: "WDG",
    dotColor: "bg-amber-500",
    iconBg: "bg-amber-500",
    color: "from-amber-500 to-orange-600",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  CR: {
    key: "CR" as const,
    label: "CR Device",
    short: "CR",
    dotColor: "bg-emerald-500",
    iconBg: "bg-emerald-600",
    color: "from-emerald-500 to-teal-600",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
}

type ComponentKey = "MIDSOLE" | "OUTSOLE" | "WEDGE" | "CR"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock; bg: string }> = {
  NOT_SUBMITTED: {
    label: "Belum Diajukan",
    color: "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800",
    bg: "bg-slate-100 dark:bg-slate-900",
    icon: Clock,
  },
  PENDING: {
    label: "Pending Review",
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

interface RoundDetail {
  id: string
  roundNo: number
  component: string
  targetColor: string
  supplierColor: string
  supplier: string
  status: string
  confirmDate: Date | string
  approvalDate: Date | string | null
  projectDev: string
  requesterName: string
  notes: string | null
  devFeedback: string | null
  imageUrl: string | null
}

interface WindowArticleData {
  article: string
  modelName: string
  defaultSupplier: string
  projectDev: string
  trackingBatchId: string | null
  imageUrl: string | null
  components: {
    MIDSOLE: { targetColor: string; defaultSupplier: string; rounds: RoundDetail[]; currentStatus: string }
    OUTSOLE: { targetColor: string; defaultSupplier: string; rounds: RoundDetail[]; currentStatus: string }
    WEDGE: { targetColor: string; defaultSupplier: string; rounds: RoundDetail[]; currentStatus: string }
    CR: { targetColor: string; defaultSupplier: string; rounds: RoundDetail[]; currentStatus: string }
  }
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

function ConformHistoryContent() {
  const searchParams = useSearchParams()
  const initialArticle = searchParams?.get("article") || ""

  const { data: session } = useSession()
  const role = session?.user?.role
  const permissions = session?.user?.permissions || []
  const canManage = role === "SUPER_ADMIN" || permissions.includes("MANAGE_TRACKING") || role === "ADMIN"

  const [articles, setArticles] = useState<ArticleConformSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialArticle)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [stats, setStats] = useState({ total: 0, submitted: 0, approved: 0, pending: 0, rejected: 0 })
  const [trackingArticles, setTrackingArticles] = useState<TrackingArticleOption[]>([])

  // Windowed Modal States (Center Dialog)
  const [isWindowOpen, setIsWindowOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null)
  const [windowData, setWindowData] = useState<WindowArticleData | null>(null)
  const [windowLoading, setWindowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ComponentKey>("MIDSOLE")

  // Inline Add Round Form State inside Window
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false)
  const [addRoundForm, setAddRoundForm] = useState({
    confirmDate: format(new Date(), "yyyy-MM-dd"),
    targetColor: "",
    supplierColor: "",
    supplier: "",
    projectDev: "",
    notes: "",
  })

  // Edit Developer & Vendor Modal State
  const [isEditDevVendorOpen, setIsEditDevVendorOpen] = useState(false)
  const [editProjectDev, setEditProjectDev] = useState("")
  const [editSupplier, setEditSupplier] = useState("")

  // Review Dialog State (PD Review)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [selectedRoundForReview, setSelectedRoundForReview] = useState<RoundDetail | null>(null)
  const [reviewStatus, setReviewStatus] = useState("APPROVED")
  const [reviewFeedback, setReviewFeedback] = useState("")
  const [reviewProjectDev, setReviewProjectDev] = useState("")

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Article Picker Modal State (for "+ New Color Conform")
  const [isArticlePickerOpen, setIsArticlePickerOpen] = useState(false)
  const [pickerSearchQuery, setPickerSearchQuery] = useState("")

  const [isPending, startTransition] = useTransition()

  // Fetch all articles grouped for table
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getGroupedConformArticles({
        search: searchQuery,
        statusFilter,
      })
      setArticles(res.summaries)
      setStats(res.stats)
    } catch (err) {
      console.error(err)
      toast.error("Gagal memuat daftar conform artikel")
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter])

  // Load tracking articles for picker
  useEffect(() => {
    async function loadTrackingArticles() {
      try {
        const data = await getArticlesFromTracking()
        setTrackingArticles(data as unknown as TrackingArticleOption[])
      } catch (err) {
        console.error("Gagal memuat artikel tracking", err)
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

  // Open Window Modal for an Article
  const handleOpenWindow = useCallback(async (articleCode: string) => {
    setSelectedArticle(articleCode)
    setIsWindowOpen(true)
    setIsAddRoundOpen(false)
    setWindowLoading(true)
    try {
      const data = await getArticleConformDetails(articleCode)
      setWindowData(data as unknown as WindowArticleData)
      setReviewProjectDev(data.projectDev && data.projectDev !== "-" ? data.projectDev : "")
    } catch (err) {
      console.error(err)
      toast.error("Gagal memuat detail artikel")
    } finally {
      setWindowLoading(false)
    }
  }, [])

  // Auto-open window if initialArticle param present
  useEffect(() => {
    if (initialArticle && !selectedArticle) {
      handleOpenWindow(initialArticle)
    }
  }, [initialArticle, selectedArticle, handleOpenWindow])

  // Reload active window data
  const reloadWindowData = async (articleCode: string) => {
    try {
      const data = await getArticleConformDetails(articleCode)
      setWindowData(data as unknown as WindowArticleData)
    } catch (err) {
      console.error(err)
    }
  }

  // Handle Switch Component Tab inside Window
  const handleSelectTab = (tab: ComponentKey) => {
    setActiveTab(tab)
    setIsAddRoundOpen(false)
  }

  // Open Edit Developer & Vendor Modal
  const handleOpenEditDevVendor = () => {
    if (!windowData) return
    setEditProjectDev(windowData.projectDev && windowData.projectDev !== "-" ? windowData.projectDev : "")
    setEditSupplier(windowData.defaultSupplier && windowData.defaultSupplier !== "-" ? windowData.defaultSupplier : "")
    setIsEditDevVendorOpen(true)
  }

  // Save Developer & Vendor
  const handleSaveDevVendor = () => {
    if (!windowData) return
    startTransition(async () => {
      try {
        const res = await updateArticleDevAndSupplier({
          article: windowData.article,
          projectDev: editProjectDev.trim() || "-",
          supplier: editSupplier.trim() || "-",
        })
        if (res.success) {
          toast.success(res.message)
          setIsEditDevVendorOpen(false)
          reloadWindowData(windowData.article)
          fetchData()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal memperbarui developer & vendor")
      }
    })
  }

  // Open Add Round Form for active component
  const handleOpenAddRound = () => {
    if (!windowData) return
    const compData = windowData.components[activeTab]
    setAddRoundForm({
      confirmDate: format(new Date(), "yyyy-MM-dd"),
      targetColor: compData.targetColor !== "-" ? compData.targetColor : "",
      supplierColor: "",
      supplier: compData.defaultSupplier || (windowData.defaultSupplier !== "-" ? windowData.defaultSupplier : ""),
      projectDev: windowData.projectDev !== "-" ? windowData.projectDev : "",
      notes: "",
    })
    setIsAddRoundOpen(true)
  }

  // Submit New Round for Active Component
  const handleSubmitAddRound = (e: React.FormEvent) => {
    e.preventDefault()
    if (!windowData) return
    if (!addRoundForm.targetColor.trim()) {
      toast.error("Target Color wajib diisi")
      return
    }

    startTransition(async () => {
      try {
        const res = await submitComponentCfmRound({
          article: windowData.article,
          modelName: windowData.modelName,
          component: activeTab,
          targetColor: addRoundForm.targetColor.trim(),
          supplierColor: addRoundForm.supplierColor.trim() || undefined,
          supplier: addRoundForm.supplier.trim() || undefined,
          projectDev: addRoundForm.projectDev.trim() || (windowData.projectDev !== "-" ? windowData.projectDev : "-"),
          confirmDate: new Date(addRoundForm.confirmDate),
          notes: addRoundForm.notes.trim() || undefined,
          trackingBatchId: windowData.trackingBatchId || undefined,
        })

        if (res.success) {
          toast.success(res.message)
          setIsAddRoundOpen(false)
          reloadWindowData(windowData.article)
          fetchData()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal menambahkan round CFM")
      }
    })
  }

  // Open PD Review Dialog for a specific round
  const handleOpenReview = (round: RoundDetail) => {
    setSelectedRoundForReview(round)
    setReviewStatus(round.status === "PENDING" ? "APPROVED" : round.status)
    setReviewFeedback(round.devFeedback || "")
    setReviewProjectDev(
      round.projectDev && round.projectDev !== "-"
        ? round.projectDev
        : (windowData?.projectDev && windowData.projectDev !== "-" ? windowData.projectDev : "")
    )
    setIsReviewOpen(true)
  }

  // Submit Review Decision
  const handleSubmitReview = () => {
    if (!selectedRoundForReview || !windowData) return

    startTransition(async () => {
      try {
        const res = await reviewComponentCfmRound(selectedRoundForReview.id, {
          status: reviewStatus,
          devFeedback: reviewFeedback.trim(),
          projectDev: reviewProjectDev.trim() || "-",
        })

        if (res.success) {
          toast.success(res.message)
          setIsReviewOpen(false)
          setSelectedRoundForReview(null)
          reloadWindowData(windowData.article)
          fetchData()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan keputusan")
      }
    })
  }

  // Delete round
  const handleDeleteRound = (roundId: string) => {
    setDeletingId(roundId)
    setIsDeleteOpen(true)
  }

  const confirmDeleteRound = async () => {
    if (!deletingId || isDeleting) return
    setIsDeleting(true)
    try {
      const res = await deleteConformEntry(deletingId)
      if (res.success) {
        toast.success(res.message)
        setIsDeleteOpen(false)
        setDeletingId(null)
        if (windowData) await reloadWindowData(windowData.article)
        fetchData()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus data")
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtered tracking articles for picker modal
  const filteredTrackingArticles = trackingArticles.filter((item) => {
    if (!pickerSearchQuery.trim()) return true
    const q = pickerSearchQuery.toLowerCase()
    return (
      item.article.toLowerCase().includes(q) ||
      item.modelName.toLowerCase().includes(q) ||
      (item.supplier && item.supplier.toLowerCase().includes(q))
    )
  })

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Color Conform History</h1>
            <p className="text-sm text-muted-foreground">
              Konfirmasi warna bertahap per komponen (Midsole, Outsole, Wedge, CR) ke Team Project Developer.
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
            Refresh
          </Button>
          {canManage && (
            <Button
              onClick={() => setIsArticlePickerOpen(true)}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4" />
              New Color Conform
            </Button>
          )}
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="shadow-xs border bg-card/60">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-xs text-muted-foreground font-medium">Total Artikel</div>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">Terdaftar di sistem</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">Ada Pengajuan</div>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{stats.submitted}</div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Sedang berjalan / ada CFM</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Pending Review PD
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pending}</div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400">Menunggu keputusan</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All 4 Approved
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.approved}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Semua komponen OK</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-xs text-red-700 dark:text-red-400 font-medium flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" />
              Rejected / Revise
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.rejected}</div>
            <div className="text-[10px] text-red-600 dark:text-red-400">Butuh putaran CFM ulang</div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari artikel, model, vendor, developer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {[
            { id: "ALL", label: "Semua" },
            { id: "SUBMITTED", label: "Ada CFM" },
            { id: "PENDING", label: "Pending PD" },
            { id: "ALL_APPROVED", label: "All Approved" },
            { id: "REJECTED", label: "Rejected" },
          ].map((f) => (
            <Button
              key={f.id}
              variant={statusFilter === f.id ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "h-8 text-xs px-2.5",
                statusFilter === f.id && "bg-indigo-600 hover:bg-indigo-700 text-white"
              )}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* MAIN TABLE: DAFTAR ARTIKEL (FOTO, ARTIKEL, PROGRESS, EDIT) */}
      <Card className="shadow-xs overflow-hidden border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[85px] pl-4">Foto</TableHead>
                <TableHead className="w-[240px]">Artikel & Model</TableHead>
                <TableHead className="min-w-[300px]">Progress Konfirmasi Warna</TableHead>
                <TableHead className="w-[120px] text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      <span className="text-xs text-muted-foreground">Memuat data konfirmasi warna...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : articles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                    Tidak ada artikel yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                articles.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.overallStatus] || STATUS_CONFIG.NOT_SUBMITTED

                  return (
                    <TableRow 
                      key={item.article} 
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* 1. FOTO ARTIKEL */}
                      <TableCell className="align-middle py-3.5 pl-4">
                        {item.imageUrl ? (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-border shadow-2xs group bg-muted/20 shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.article}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg border border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground/50 shrink-0">
                            <Palette className="h-5 w-5 stroke-[1.5]" />
                            <span className="text-[9px] mt-0.5 font-medium">No Foto</span>
                          </div>
                        )}
                      </TableCell>

                      {/* 2. ARTIKEL & MODEL */}
                      <TableCell className="align-middle py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground bg-muted/70 px-2.5 py-0.5 rounded border border-border/70">
                              {item.article}
                            </span>
                            <span className="text-sm font-bold text-foreground">
                              {item.modelName || "-"}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            <span>Dev: <strong className="text-foreground">{item.projectDev !== "-" ? item.projectDev : "Belum diset"}</strong></span>
                            {item.supplier && item.supplier !== "-" && (
                              <span>• Vendor: <strong className="text-foreground">{item.supplier}</strong></span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* 3. PROGRESS KONFIRMASI WARNA */}
                      <TableCell className="align-middle py-3.5">
                        <div className="space-y-2 max-w-lg">
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className={cn("text-[11px] font-semibold gap-1.5 px-2.5 py-0.5 rounded-full", statusCfg.color, statusCfg.bg)}
                            >
                              <statusCfg.icon className="h-3 w-3" />
                              {item.overallStatus === "ALL_APPROVED" ? "All 4 Approved" : statusCfg.label}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">
                              {item.approvedCount} / 4 Approved {item.totalRounds > 0 ? `(${item.totalRounds} Putaran)` : ""}
                            </span>
                          </div>

                          <Progress value={(item.approvedCount / 4) * 100} className="h-2 rounded-full" />

                          {/* 4 Komponen Mini Status Indicator */}
                          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                            {[
                              { short: "MID", name: "Midsole", data: item.midsole, dot: null },
                              { short: "OUT", name: "Outsole", data: item.outsole, dot: null },
                              { short: "WDG", name: "Wedge", data: item.wedge, dot: "bg-amber-500" },
                              { short: "CR", name: "CR Device", data: item.cr, dot: "bg-emerald-500" },
                            ].map((c) => {
                              const cCfg = STATUS_CONFIG[c.data.status] || STATUS_CONFIG.NOT_SUBMITTED
                              return (
                                <div
                                  key={c.short}
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded border text-center font-medium truncate flex items-center justify-center gap-1",
                                    cCfg.color,
                                    cCfg.bg
                                  )}
                                  title={`${c.name}: ${cCfg.label} (${c.data.roundsCount} CFM)`}
                                >
                                  {c.dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.dot)} />}
                                  <span className="font-bold">{c.short}:</span>
                                  <span>{c.data.roundsCount > 0 ? `${c.data.roundsCount} CFM` : "-"}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </TableCell>

                      {/* 4. ACTION: TOMBOL EDIT / BUKA WINDOW */}
                      <TableCell className="align-middle py-3.5 text-right pr-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenWindow(item.article)}
                          className="h-9 px-3 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 dark:border-indigo-800 gap-1.5 shadow-xs font-semibold rounded-lg"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit CFM
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* WINDOWED MODAL (DIALOG): COLOR CONFORM PER-COMPONENT MULTI-ROUND TIMELINE */}
      {/* ========================================================================= */}
      <Dialog open={isWindowOpen} onOpenChange={setIsWindowOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-background border shadow-2xl rounded-xl">
          {windowLoading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-xs text-muted-foreground font-medium">Memuat data Color Conform...</p>
            </div>
          ) : !windowData ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Data artikel tidak ditemukan.
            </div>
          ) : (
            <div>
              {/* WINDOW HEADER */}
              <div className="p-5 border-b bg-background space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-base text-foreground bg-muted/60 px-2.5 py-0.5 rounded border border-border/70">
                        {windowData.article}
                      </span>
                      <span className="font-bold text-base text-foreground">
                        {windowData.modelName}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>Project Developer: <strong className="text-foreground font-semibold">{windowData.projectDev !== "-" ? windowData.projectDev : "Belum diset"}</strong></span>
                      <span>• Supplier: <strong className="text-foreground font-semibold">{windowData.defaultSupplier || "-"}</strong></span>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleOpenEditDevVendor}
                          className="h-5 px-1.5 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1 font-semibold rounded border border-indigo-200 dark:border-indigo-800 ml-1"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                          Ubah
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4 COMPONENT CARDS / BUTTONS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {(["MIDSOLE", "OUTSOLE", "WEDGE", "CR"] as ComponentKey[]).map((cKey) => {
                    const cfg = COMPONENT_CONFIG[cKey]
                    const compData = windowData.components[cKey]
                    const isSelected = activeTab === cKey
                    const statusCfg = STATUS_CONFIG[compData.currentStatus] || STATUS_CONFIG.NOT_SUBMITTED

                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => handleSelectTab(cKey)}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-xl border text-left transition-all relative",
                          isSelected
                            ? "border-2 border-indigo-600 bg-white dark:bg-card shadow-sm ring-1 ring-indigo-500/20"
                            : "border-slate-200 dark:border-slate-800 bg-card/60 hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            {cfg.dotColor && (
                              <span className={cn("inline-block w-2.5 h-2.5 rounded-full shrink-0", cfg.dotColor)} />
                            )}
                            {cfg.short}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {compData.rounds.length > 0 ? `${compData.rounds.length} CFM` : "-"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate w-full mt-0.5">
                          {cfg.label}
                        </div>
                        <div className="mt-2">
                          <span
                            className={cn("inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium border leading-none", statusCfg.color, statusCfg.bg)}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* WINDOW BODY: SELECTED COMPONENT DETAIL */}
              <div className="p-5 space-y-6">
                {(() => {
                  const compCfg = COMPONENT_CONFIG[activeTab]
                  const compData = windowData.components[activeTab]
                  const statusCfg = STATUS_CONFIG[compData.currentStatus] || STATUS_CONFIG.NOT_SUBMITTED

                  return (
                    <div className="space-y-5">
                      {/* COMPONENT INFO CARD */}
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg text-white shadow-xs shrink-0", compCfg.iconBg)}>
                              <Layers className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-foreground">
                                {compCfg.label} ({compCfg.short})
                              </h3>
                              <p className="text-[11px] text-muted-foreground">
                                Alur konfirmasi warna khusus komponen {compCfg.label}.
                              </p>
                            </div>
                          </div>

                          <span
                            className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border", statusCfg.color, statusCfg.bg)}
                          >
                            <statusCfg.icon className="h-3.5 w-3.5" />
                            {statusCfg.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-muted-foreground font-normal block text-xs mb-0.5">Target Color (Standar PO):</span>
                            <span className="font-bold text-foreground text-sm uppercase">
                              {compData.targetColor !== "-" ? compData.targetColor : <span className="text-muted-foreground italic font-normal">Belum diset</span>}
                            </span>
                          </div>

                          <div>
                            <span className="text-muted-foreground font-normal block text-xs mb-0.5">Vendor / Supplier:</span>
                            <span className="italic text-muted-foreground text-sm">
                              {compData.defaultSupplier || "Sama dg artikel"}
                            </span>
                          </div>

                          <div>
                            <span className="text-muted-foreground font-normal block text-xs mb-0.5">Riwayat Pengajuan:</span>
                            <span className="font-bold text-foreground text-sm">
                              {compData.rounds.length} Putaran CFM
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ACTION: ADD NEW ROUND BUTTON */}
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          RIWAYAT PUTARAN CFM ({compData.rounds.length})
                        </h4>

                        {canManage && !isAddRoundOpen && (
                          <Button
                            size="sm"
                            onClick={handleOpenAddRound}
                            className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold rounded-lg"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {compData.rounds.length === 0 ? `Ajukan 1st CFM ${compCfg.short}` : `+ Ajukan Round #${compData.rounds.length + 1}`}
                          </Button>
                        )}
                      </div>

                      {/* INLINE FORM: SUBMIT NEW ROUND */}
                      {isAddRoundOpen && (
                        <Card className="border-2 border-indigo-500 shadow-md bg-indigo-50/20 dark:bg-indigo-950/20">
                          <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                              <span className="text-indigo-700 dark:text-indigo-300">
                                Form Pengajuan CFM Round #{compData.rounds.length + 1} ({compCfg.label})
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsAddRoundOpen(false)}
                                className="h-6 px-2 text-xs"
                              >
                                Batal
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-2">
                            <form onSubmit={handleSubmitAddRound} className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-semibold">Tanggal Pengajuan</Label>
                                  <Input
                                    type="date"
                                    value={addRoundForm.confirmDate}
                                    onChange={(e) => setAddRoundForm(prev => ({ ...prev, confirmDate: e.target.value }))}
                                    className="h-8 text-xs"
                                    required
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[11px] font-semibold">Project Developer (PD)</Label>
                                  <Input
                                    placeholder="Nama Project Developer"
                                    value={addRoundForm.projectDev}
                                    onChange={(e) => setAddRoundForm(prev => ({ ...prev, projectDev: e.target.value }))}
                                    className="h-8 text-xs"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[11px] font-semibold">Vendor / Supplier</Label>
                                  <Input
                                    placeholder="Nama vendor komponen ini"
                                    value={addRoundForm.supplier}
                                    onChange={(e) => setAddRoundForm(prev => ({ ...prev, supplier: e.target.value }))}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-semibold">Target Color (Standar PO)</Label>
                                  <Input
                                    placeholder="e.g. SEA SALT"
                                    value={addRoundForm.targetColor}
                                    onChange={(e) => setAddRoundForm(prev => ({ ...prev, targetColor: e.target.value }))}
                                    className="h-8 text-xs font-medium"
                                    required
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                    Warna Aktual Sampel (Supplier)
                                  </Label>
                                  <Input
                                    placeholder="Warna dari vendor jika ada deviasi"
                                    value={addRoundForm.supplierColor}
                                    onChange={(e) => setAddRoundForm(prev => ({ ...prev, supplierColor: e.target.value }))}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-[11px] font-semibold">Catatan Pengajuan</Label>
                                <Textarea
                                  placeholder="Contoh: Sampel revisi lab dip ke-2 dari Pou Chen..."
                                  rows={2}
                                  value={addRoundForm.notes}
                                  onChange={(e) => setAddRoundForm(prev => ({ ...prev, notes: e.target.value }))}
                                  className="text-xs"
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsAddRoundOpen(false)}
                                  className="h-8 text-xs"
                                >
                                  Batal
                                </Button>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={isPending}
                                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                  {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                                  Kirim Pengajuan Round #{compData.rounds.length + 1}
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      )}

                      {/* ROUNDS TIMELINE (NEWEST FIRST) */}
                      {compData.rounds.length === 0 ? (
                        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/20 dark:bg-slate-900/10">
                          <Clock className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                          <p className="text-xs text-muted-foreground font-normal">
                            Belum ada pengajuan CFM untuk komponen {compCfg.label}.
                          </p>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleOpenAddRound}
                              className="text-xs gap-1.5 font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xs h-8 hover:bg-slate-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Ajukan 1st CFM Sekarang
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-indigo-200 dark:before:bg-indigo-900/60">
                          {[...compData.rounds].reverse().map((round, idx) => {
                            const roundStatusCfg = STATUS_CONFIG[round.status] || STATUS_CONFIG.PENDING
                            const RoundStatusIcon = roundStatusCfg.icon
                            const isLatest = idx === 0

                            return (
                              <div key={round.id} className="relative">
                                {/* Dot indicator */}
                                <div className={cn(
                                  "absolute -left-[29px] top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 shadow-xs",
                                  isLatest ? "border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900" : "border-slate-400"
                                )}>
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                    {round.roundNo}
                                  </span>
                                </div>

                                <Card className={cn(
                                  "shadow-xs transition-all",
                                  isLatest && "border-indigo-300 dark:border-indigo-800"
                                )}>
                                  <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-foreground">
                                          {round.roundNo === 1 ? "1st CFM" : round.roundNo === 2 ? "2nd CFM" : round.roundNo === 3 ? "3rd CFM" : `${round.roundNo}th CFM`}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          • <Calendar className="h-3 w-3" />
                                          {format(new Date(round.confirmDate), "dd MMM yyyy", { locale: localeId })}
                                        </span>
                                      </div>

                                      <Badge
                                        variant="outline"
                                        className={cn("text-[11px] font-semibold gap-1 px-2 py-0.5", roundStatusCfg.color, roundStatusCfg.bg)}
                                      >
                                        <RoundStatusIcon className="h-3 w-3" />
                                        {roundStatusCfg.label}
                                      </Badge>
                                    </div>

                                    {/* COLOR & VENDOR SPECS */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg border">
                                      <div>
                                        <span className="text-muted-foreground font-medium">Standar Target: </span>
                                        <span className="font-semibold text-foreground">{round.targetColor}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground font-medium">Warna Sampel: </span>
                                        <span className={cn(
                                          "font-semibold",
                                          round.supplierColor && round.supplierColor !== round.targetColor 
                                            ? "text-amber-700 dark:text-amber-300" 
                                            : "text-foreground"
                                        )}>
                                          {round.supplierColor || <span className="opacity-50 italic">Sama</span>}
                                        </span>
                                      </div>
                                      <div className="sm:col-span-2">
                                        <span className="text-muted-foreground font-medium">Vendor / Supplier: </span>
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                          {round.supplier || "-"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* REQUESTER NOTES */}
                                    {round.notes && (
                                      <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/40 p-2 rounded border">
                                        <span className="font-semibold text-foreground">Catatan Pengaju ({round.requesterName}): </span>
                                        {round.notes}
                                      </div>
                                    )}

                                    {/* PROJECT DEVELOPER FEEDBACK / DECISION */}
                                    {round.devFeedback && (
                                      <div className="text-xs bg-indigo-50/60 dark:bg-indigo-950/40 p-2.5 rounded border border-indigo-200 dark:border-indigo-800 space-y-1">
                                        <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
                                          <span>Feedback {round.projectDev}:</span>
                                          {round.approvalDate && (
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                              {format(new Date(round.approvalDate), "dd MMM yyyy", { locale: localeId })}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-indigo-800 dark:text-indigo-300">
                                          {round.devFeedback}
                                        </p>
                                      </div>
                                    )}

                                    {/* ACTIONS FOR THIS ROUND */}
                                    <div className="flex items-center justify-between pt-1 border-t text-xs">
                                      {canManage ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleOpenReview(round)}
                                          className="h-7 text-xs gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                                        >
                                          <UserCheck className="h-3.5 w-3.5" />
                                          {round.status === "PENDING" ? "⚡ Keputusan PD (Review)" : "Ubah Keputusan PD"}
                                        </Button>
                                      ) : <div />}

                                      {canManage && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteRound(round.id)}
                                          className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* WINDOW FOOTER */}
              <div className="p-4 border-t bg-muted/20 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWindowOpen(false)}
                  className="h-8 text-xs"
                >
                  Tutup Window
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: PROJECT DEVELOPER REVIEW & DECISION */}
      {/* ========================================================================= */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Keputusan Project Developer
            </DialogTitle>
            <DialogDescription>
              Tentukan hasil evaluasi warna untuk {selectedRoundForReview?.component} round #{selectedRoundForReview?.roundNo}{" "}
              artikel <strong className="text-foreground">{windowData?.article}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1">
              <div><strong>Target:</strong> {selectedRoundForReview?.targetColor}</div>
              <div><strong>Warna Sampel:</strong> {selectedRoundForReview?.supplierColor}</div>
              <div><strong>Vendor:</strong> {selectedRoundForReview?.supplier}</div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Developer In Charge</Label>
              <Input
                value={reviewProjectDev}
                onChange={(e) => setReviewProjectDev(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Keputusan</Label>
              <Select value={reviewStatus} onValueChange={(val) => { if (val) setReviewStatus(val) }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">✅ APPROVED (Disetujui / OK to Proceed)</SelectItem>
                  <SelectItem value="APPROVED_WITH_NOTE">ℹ️ APPROVED WITH NOTE (Disetujui Bersyarat)</SelectItem>
                  <SelectItem value="REJECTED">❌ REJECTED / REVISE (Ditolak / Minta Kirim Ulang)</SelectItem>
                  <SelectItem value="PENDING">⏳ PENDING (Masih Menunggu Evaluasi)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Feedback / Komentar Developer</Label>
              <Textarea
                placeholder="Contoh: Warna Sea Salt acceptable untuk trial S2..."
                rows={3}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsReviewOpen(false)} className="h-8 text-xs">
              Batal
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isPending}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Simpan Keputusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: SELECT ARTICLE MODAL (LAUNCH WINDOW) */}
      {/* ========================================================================= */}
      <Dialog open={isArticlePickerOpen} onOpenChange={setIsArticlePickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              Pilih Artikel untuk Color Conform
            </DialogTitle>
            <DialogDescription>
              Pilih artikel terdaftar dari Purchase Tracking untuk membuka Window konfirmasi warna.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kode artikel, model, supplier..."
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-muted/10">
              {filteredTrackingArticles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Artikel tidak ditemukan.</p>
              ) : (
                filteredTrackingArticles.map((item) => (
                  <div
                    key={item.article}
                    onClick={() => {
                      setIsArticlePickerOpen(false)
                      handleOpenWindow(item.article)
                    }}
                    className="p-2.5 rounded-lg hover:bg-primary/10 hover:border-primary/30 border border-transparent cursor-pointer transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {item.article}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{item.modelName}</span>
                    </div>
                    {item.supplier && (
                      <div className="text-[11px] text-muted-foreground">
                        Vendor: {item.supplier}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsArticlePickerOpen(false)} className="h-8 text-xs">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: EDIT DEVELOPER & VENDOR ARTIKEL */}
      {/* ========================================================================= */}
      <Dialog open={isEditDevVendorOpen} onOpenChange={setIsEditDevVendorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-indigo-600" />
              Kustomisasi Developer & Vendor
            </DialogTitle>
            <DialogDescription>
              Atur Project Developer dan Supplier/Vendor default untuk artikel{" "}
              <strong className="text-foreground">{windowData?.article}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Project Developer (PD)</Label>
              <Input
                placeholder="Misal: Budi (PD) / Team PD..."
                value={editProjectDev}
                onChange={(e) => setEditProjectDev(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Nama team atau personil Project Developer yang bertanggung jawab mengonfirmasi warna artikel ini.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supplier / Vendor Default</Label>
              <Input
                placeholder="Misal: Pou Chen / Feng Tay..."
                value={editSupplier}
                onChange={(e) => setEditSupplier(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Supplier/vendor artikel ini yang dapat disesuaikan per komponen nanti jika berbeda.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDevVendorOpen(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDevVendor}
              disabled={isPending}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: CONFIRM DELETE ROUND */}
      {/* ========================================================================= */}
      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setIsDeleteOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Putaran CFM Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Data putaran konfirmasi warna ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDeleteRound()
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[95px] transition-all gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
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

export default function ConformHistoryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ConformHistoryContent />
    </Suspense>
  )
}
