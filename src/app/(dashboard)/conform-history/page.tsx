"use client"

import { useEffect, useState, useTransition, useCallback, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  Palette, Search, Plus, Trash2, Loader2,
  CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw,
  UserCheck, Layers, ChevronRight,
  Calendar, Building2
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
  Sheet, SheetContent
} from "@/components/ui/sheet"
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
  ArticleConformSummary,
  ComponentStatusSummary,
} from "@/app/actions/conform"

const COMPONENT_CONFIG = {
  MIDSOLE: {
    key: "MIDSOLE" as const,
    label: "Midsole",
    short: "MID",
    color: "from-sky-500 to-blue-600",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  OUTSOLE: {
    key: "OUTSOLE" as const,
    label: "Outsole",
    short: "OUT",
    color: "from-indigo-500 to-violet-600",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  WEDGE: {
    key: "WEDGE" as const,
    label: "Wedge",
    short: "WDG",
    color: "from-amber-500 to-orange-600",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  CR: {
    key: "CR" as const,
    label: "CR Device",
    short: "CR",
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

interface DrawerArticleData {
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

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null)
  const [drawerData, setDrawerData] = useState<DrawerArticleData | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ComponentKey>("MIDSOLE")

  // Inline Add Round Form State inside Drawer
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false)
  const [addRoundForm, setAddRoundForm] = useState({
    confirmDate: format(new Date(), "yyyy-MM-dd"),
    targetColor: "",
    supplierColor: "",
    supplier: "",
    notes: "",
  })

  // Review Dialog State (PD Review)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [selectedRoundForReview, setSelectedRoundForReview] = useState<RoundDetail | null>(null)
  const [reviewStatus, setReviewStatus] = useState("APPROVED")
  const [reviewFeedback, setReviewFeedback] = useState("")
  const [reviewProjectDev, setReviewProjectDev] = useState("")

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // New Article Picker Modal State
  const [isArticlePickerOpen, setIsArticlePickerOpen] = useState(false)
  const [pickerSearchQuery, setPickerSearchQuery] = useState("")

  const [isPending, startTransition] = useTransition()

  // Fetch all articles grouped
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

  // Open Drawer for an Article
  const handleOpenDrawer = useCallback(async (articleCode: string) => {
    setSelectedArticle(articleCode)
    setIsDrawerOpen(true)
    setIsAddRoundOpen(false)
    setDrawerLoading(true)
    try {
      const data = await getArticleConformDetails(articleCode)
      setDrawerData(data as unknown as DrawerArticleData)
      setReviewProjectDev(data.projectDev || session?.user?.name || "Arif (PD)")
    } catch (err) {
      console.error(err)
      toast.error("Gagal memuat detail artikel")
    } finally {
      setDrawerLoading(false)
    }
  }, [session?.user?.name])

  // Auto-open drawer if initialArticle param present
  useEffect(() => {
    if (initialArticle && !selectedArticle) {
      handleOpenDrawer(initialArticle)
    }
  }, [initialArticle, selectedArticle, handleOpenDrawer])

  // Reload active drawer data
  const reloadDrawerData = async (articleCode: string) => {
    try {
      const data = await getArticleConformDetails(articleCode)
      setDrawerData(data as unknown as DrawerArticleData)
    } catch (err) {
      console.error(err)
    }
  }

  // Handle Switch Component Tab in Drawer
  const handleSelectTab = (tab: ComponentKey) => {
    setActiveTab(tab)
    setIsAddRoundOpen(false)
  }

  // Open Add Round Form for active component
  const handleOpenAddRound = () => {
    if (!drawerData) return
    const compData = drawerData.components[activeTab]
    setAddRoundForm({
      confirmDate: format(new Date(), "yyyy-MM-dd"),
      targetColor: compData.targetColor !== "-" ? compData.targetColor : "",
      supplierColor: "",
      supplier: compData.defaultSupplier || drawerData.defaultSupplier || "",
      notes: "",
    })
    setIsAddRoundOpen(true)
  }

  // Submit New Round for Active Component
  const handleSubmitAddRound = (e: React.FormEvent) => {
    e.preventDefault()
    if (!drawerData) return
    if (!addRoundForm.targetColor.trim()) {
      toast.error("Target Color wajib diisi")
      return
    }

    startTransition(async () => {
      try {
        const res = await submitComponentCfmRound({
          article: drawerData.article,
          modelName: drawerData.modelName,
          component: activeTab,
          targetColor: addRoundForm.targetColor.trim(),
          supplierColor: addRoundForm.supplierColor.trim() || undefined,
          supplier: addRoundForm.supplier.trim() || undefined,
          projectDev: drawerData.projectDev,
          confirmDate: new Date(addRoundForm.confirmDate),
          notes: addRoundForm.notes.trim() || undefined,
          trackingBatchId: drawerData.trackingBatchId || undefined,
        })

        if (res.success) {
          toast.success(res.message)
          setIsAddRoundOpen(false)
          reloadDrawerData(drawerData.article)
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
    setReviewProjectDev(round.projectDev || session?.user?.name || "Arif (PD)")
    setIsReviewOpen(true)
  }

  // Submit Review Decision
  const handleSubmitReview = () => {
    if (!selectedRoundForReview || !drawerData) return

    startTransition(async () => {
      try {
        const res = await reviewComponentCfmRound(selectedRoundForReview.id, {
          status: reviewStatus,
          devFeedback: reviewFeedback.trim(),
          projectDev: reviewProjectDev.trim(),
        })

        if (res.success) {
          toast.success(res.message)
          setIsReviewOpen(false)
          setSelectedRoundForReview(null)
          reloadDrawerData(drawerData.article)
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

  const confirmDeleteRound = () => {
    if (!deletingId) return
    startTransition(async () => {
      try {
        const res = await deleteConformEntry(deletingId)
        if (res.success) {
          toast.success(res.message)
          setIsDeleteOpen(false)
          setDeletingId(null)
          if (drawerData) reloadDrawerData(drawerData.article)
          fetchData()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal menghapus data")
      }
    })
  }

  // Helper render badge for component summary in table
  const renderComponentSummaryPill = (summary: ComponentStatusSummary, compKey: ComponentKey) => {
    const cfg = COMPONENT_CONFIG[compKey]
    const statusCfg = STATUS_CONFIG[summary.status] || STATUS_CONFIG.NOT_SUBMITTED

    if (summary.status === "NOT_SUBMITTED" && !summary.targetColor) {
      return (
        <div className="text-[11px] text-muted-foreground/60 italic">
          -
        </div>
      )
    }

    return (
      <div className="space-y-1 p-2 rounded-lg bg-card border shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-[11px] text-foreground flex items-center gap-1">
            <span className={cn("inline-block w-2 h-2 rounded-full", cfg.color.replace("from-", "bg-"))} />
            {cfg.short}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1 py-0 font-medium leading-none shrink-0", statusCfg.color, statusCfg.bg)}
          >
            {summary.roundsCount > 0 ? `${summary.latestRoundNo} CFM • ${statusCfg.label}` : statusCfg.label}
          </Badge>
        </div>

        <div className="text-[11px] leading-tight text-muted-foreground flex flex-col gap-0.5">
          <div className="truncate">
            <span className="text-slate-400">Target:</span>{" "}
            <span className="font-semibold text-foreground">{summary.targetColor || "-"}</span>
          </div>
          {summary.latestSampleColor && summary.latestSampleColor !== summary.targetColor && (
            <div className="truncate text-amber-700 dark:text-amber-300 font-medium">
              Spl: {summary.latestSampleColor}
            </div>
          )}
          {summary.supplier && (
            <div className="truncate text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              {summary.supplier}
            </div>
          )}
        </div>
      </div>
    )
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

      {/* MAIN TABLE: GROUPED BY ARTICLE */}
      <Card className="shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[180px]">Artikel & Model</TableHead>
                <TableHead className="w-[150px]">Developer & Vendor</TableHead>
                <TableHead className="w-[170px]">1. Midsole (MID)</TableHead>
                <TableHead className="w-[170px]">2. Outsole (OUT)</TableHead>
                <TableHead className="w-[170px]">3. Wedge (WDG)</TableHead>
                <TableHead className="w-[170px]">4. CR Device (CR)</TableHead>
                <TableHead className="w-[140px]">Progress & Status</TableHead>
                <TableHead className="w-[100px] text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      <span className="text-xs text-muted-foreground">Memuat data konfirmasi warna...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : articles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                    Tidak ada artikel yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                articles.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.overallStatus] || STATUS_CONFIG.NOT_SUBMITTED

                  return (
                    <TableRow 
                      key={item.article} 
                      onClick={() => handleOpenDrawer(item.article)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      {/* ARTICLE & MODEL */}
                      <TableCell className="align-top py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {item.article}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-foreground">
                            {item.modelName || "-"}
                          </div>
                        </div>
                      </TableCell>

                      {/* DEVELOPER & VENDOR */}
                      <TableCell className="align-top py-3">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <UserCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span>{item.projectDev}</span>
                          </div>
                          {item.supplier && item.supplier !== "-" && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.supplier}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* 4 COMPONENTS STATUS */}
                      <TableCell className="align-top py-3">
                        {renderComponentSummaryPill(item.midsole, "MIDSOLE")}
                      </TableCell>

                      <TableCell className="align-top py-3">
                        {renderComponentSummaryPill(item.outsole, "OUTSOLE")}
                      </TableCell>

                      <TableCell className="align-top py-3">
                        {renderComponentSummaryPill(item.wedge, "WEDGE")}
                      </TableCell>

                      <TableCell className="align-top py-3">
                        {renderComponentSummaryPill(item.cr, "CR")}
                      </TableCell>

                      {/* OVERALL PROGRESS & STATUS */}
                      <TableCell className="align-top py-3">
                        <div className="space-y-1.5">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] font-semibold gap-1 px-2 py-0.5", statusCfg.color, statusCfg.bg)}
                          >
                            <statusCfg.icon className="h-3 w-3" />
                            {item.overallStatus === "ALL_APPROVED" ? "All Approved" : statusCfg.label}
                          </Badge>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                              <span>Approved</span>
                              <span>{item.approvedCount} / 4</span>
                            </div>
                            <Progress value={(item.approvedCount / 4) * 100} className="h-1.5" />
                          </div>
                        </div>
                      </TableCell>

                      {/* ACTION BUTTON */}
                      <TableCell className="align-top py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                        >
                          Drawer
                          <ChevronRight className="h-4 w-4" />
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
      {/* SIDE DRAWER (SHEET): COLOR CONFORM PER-COMPONENT MULTI-ROUND TIMELINE */}
      {/* ========================================================================= */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto p-0 flex flex-col gap-0 bg-background border-l shadow-2xl">
          {drawerLoading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3 flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-xs text-muted-foreground font-medium">Memuat data Drawer Color Conform...</p>
            </div>
          ) : !drawerData ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Data artikel tidak ditemukan.
            </div>
          ) : (
            <>
              {/* DRAWER HEADER */}
              <div className="p-5 border-b bg-muted/20 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-lg text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                        {drawerData.article}
                      </span>
                      <span className="font-bold text-base text-foreground">
                        {drawerData.modelName}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>Project Developer: <strong className="text-foreground">{drawerData.projectDev}</strong></span>
                      {drawerData.defaultSupplier && (
                        <span>• Supplier: <strong className="text-foreground">{drawerData.defaultSupplier}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* COMPONENT SELECTION PILLS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {(["MIDSOLE", "OUTSOLE", "WEDGE", "CR"] as ComponentKey[]).map((cKey) => {
                    const cfg = COMPONENT_CONFIG[cKey]
                    const compData = drawerData.components[cKey]
                    const isSelected = activeTab === cKey
                    const statusCfg = STATUS_CONFIG[compData.currentStatus] || STATUS_CONFIG.NOT_SUBMITTED

                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => handleSelectTab(cKey)}
                        className={cn(
                          "flex flex-col items-start p-2.5 rounded-lg border text-left transition-all relative overflow-hidden",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs ring-1 ring-indigo-500"
                            : "border-border hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1">
                            <span className={cn("inline-block w-2 h-2 rounded-full", cfg.color.replace("from-", "bg-"))} />
                            {cfg.short}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                            {compData.rounds.length > 0 ? `${compData.rounds.length} CFM` : "-"}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-foreground truncate w-full mt-0.5">
                          {cfg.label}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] px-1 py-0 mt-1 font-semibold leading-none", statusCfg.color, statusCfg.bg)}
                        >
                          {statusCfg.label}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* DRAWER BODY: SELECTED COMPONENT DETAIL */}
              <div className="p-5 space-y-6 flex-1 overflow-y-auto">
                {(() => {
                  const compCfg = COMPONENT_CONFIG[activeTab]
                  const compData = drawerData.components[activeTab]
                  const statusCfg = STATUS_CONFIG[compData.currentStatus] || STATUS_CONFIG.NOT_SUBMITTED

                  return (
                    <div className="space-y-5">
                      {/* COMPONENT INFO CARD */}
                      <div className="p-4 rounded-xl border bg-card/60 shadow-xs space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-md bg-gradient-to-br text-white shadow-xs", compCfg.color)}>
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

                          <Badge
                            variant="outline"
                            className={cn("text-xs font-semibold gap-1.5 px-2.5 py-1", statusCfg.color, statusCfg.bg)}
                          >
                            <statusCfg.icon className="h-3.5 w-3.5" />
                            {statusCfg.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t">
                          <div>
                            <span className="text-muted-foreground font-medium block text-[11px]">Target Color (Standar PO):</span>
                            <span className="font-bold text-foreground text-sm">
                              {compData.targetColor !== "-" ? compData.targetColor : <span className="text-muted-foreground italic">Belum diset</span>}
                            </span>
                          </div>

                          <div>
                            <span className="text-muted-foreground font-medium block text-[11px]">Vendor / Supplier:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                              {compData.defaultSupplier || <span className="text-muted-foreground italic">Sama dg artikel</span>}
                            </span>
                          </div>

                          <div>
                            <span className="text-muted-foreground font-medium block text-[11px]">Riwayat Pengajuan:</span>
                            <span className="font-bold text-foreground text-sm">
                              {compData.rounds.length} Putaran CFM
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ACTION: ADD NEW ROUND BUTTON / TOGGLE */}
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Riwayat Putaran CFM ({compData.rounds.length})
                        </h4>

                        {canManage && !isAddRoundOpen && (
                          <Button
                            size="sm"
                            onClick={handleOpenAddRound}
                            className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
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
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <div className="text-center p-8 rounded-xl border border-dashed text-muted-foreground space-y-2 bg-muted/10">
                          <Clock className="h-8 w-8 mx-auto text-muted-foreground/40" />
                          <p className="text-xs font-medium">Belum ada pengajuan CFM untuk komponen {compCfg.label}.</p>
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleOpenAddRound}
                              className="text-xs gap-1.5"
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
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================================================================= */}
      {/* DIALOG 1: PROJECT DEVELOPER REVIEW & DECISION */}
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
              artikel <strong className="text-foreground">{drawerData?.article}</strong>.
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
      {/* DIALOG 2: SELECT ARTICLE MODAL (LAUNCH DRAWER) */}
      {/* ========================================================================= */}
      <Dialog open={isArticlePickerOpen} onOpenChange={setIsArticlePickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              Pilih Artikel untuk Color Conform
            </DialogTitle>
            <DialogDescription>
              Pilih artikel terdaftar dari Purchase Tracking untuk membuka Drawer konfirmasi warna.
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
                      handleOpenDrawer(item.article)
                    }}
                    className="p-2 rounded-md hover:bg-primary/10 hover:border-primary/30 border border-transparent cursor-pointer transition-colors space-y-1"
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
      {/* DIALOG 3: CONFIRM DELETE ROUND */}
      {/* ========================================================================= */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Putaran CFM Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Data putaran konfirmasi warna ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRound} className="bg-red-600 hover:bg-red-700 text-white">
              Hapus
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
