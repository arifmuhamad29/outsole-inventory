"use client"

import { useEffect, useState, useTransition, useCallback, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  Palette, Search, Plus, Pencil, Trash2, Loader2,
  CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw,
  UserCheck, Layers, Calendar, Sparkles, Users, X
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
  getGroupedComponentColorSummaries,
  getComponentColorGroupDetails,
  submitSharedComponentColorRound,
  updateComponentGroupDevAndSupplier,
  ArticleConformSummary,
  ComponentColorGroupSummary,
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
    MIDSOLE: { targetColor: string; defaultSupplier: string; rounds: RoundDetail[]; sharedArticles?: string[]; currentStatus: string }
    OUTSOLE: { targetColor: string; defaultSupplier: string; rounds: RoundDetail[]; sharedArticles?: string[]; currentStatus: string }
    WEDGE: { targetColor: string; defaultSupplier: string; rounds: RoundDetail[]; sharedArticles?: string[]; currentStatus: string }
    CR: { targetColor: string; defaultSupplier: string; rounds: RoundDetail[]; sharedArticles?: string[]; currentStatus: string }
  }
}

interface ComponentColorGroupData {
  id: string
  modelName: string
  component: ComponentKey
  targetColor: string
  defaultSupplier: string
  projectDev: string
  articles: { article: string; imageUrl: string | null }[]
  rounds: RoundDetail[]
  currentStatus: string
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

  // VIEW MODE: "BY_COMPONENT" (Shared Component & Color) or "BY_ARTICLE" (Individual Article Monitoring)
  const [viewMode, setViewMode] = useState<"BY_COMPONENT" | "BY_ARTICLE">("BY_COMPONENT")

  // Common Search & Filter States
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(initialArticle)
  const [appliedSearch, setAppliedSearch] = useState(initialArticle)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [componentFilter, setComponentFilter] = useState("ALL")

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim())
  }

  const handleClearSearch = () => {
    setSearchInput("")
    setAppliedSearch("")
  }

  // Data for View 1: By Component & Color
  const [componentGroups, setComponentGroups] = useState<ComponentColorGroupSummary[]>([])
  const [compStats, setCompStats] = useState({ total: 0, submitted: 0, approved: 0, pending: 0, rejected: 0 })

  // Data for View 2: By Article
  const [articles, setArticles] = useState<ArticleConformSummary[]>([])
  const [stats, setStats] = useState({ total: 0, submitted: 0, approved: 0, pending: 0, rejected: 0 })
  const [trackingArticles, setTrackingArticles] = useState<TrackingArticleOption[]>([])

  // ==========================================
  // MODAL 1: COMPONENT GROUP WINDOW (SHARED CFM)
  // ==========================================
  const [isCompGroupWindowOpen, setIsCompGroupWindowOpen] = useState(false)
  const [compGroupWindowData, setCompGroupWindowData] = useState<ComponentColorGroupData | null>(null)
  const [compGroupWindowLoading, setCompGroupWindowLoading] = useState(false)

  // Inline Add Round Form State inside Component Group Window
  const [isCompGroupAddRoundOpen, setIsCompGroupAddRoundOpen] = useState(false)
  const [compGroupAddRoundForm, setCompGroupAddRoundForm] = useState({
    confirmDate: format(new Date(), "yyyy-MM-dd"),
    targetColor: "",
    supplierColor: "",
    supplier: "",
    projectDev: "",
    notes: "",
  })

  // Edit Developer & Vendor Modal for Component Group
  const [isCompGroupEditDevVendorOpen, setIsCompGroupEditDevVendorOpen] = useState(false)
  const [compGroupEditDev, setCompGroupEditDev] = useState("")
  const [compGroupEditSupplier, setCompGroupEditSupplier] = useState("")

  // ==========================================
  // MODAL 2: ARTICLE WINDOW (MONITORING PER ARTIKEL)
  // ==========================================
  const [isWindowOpen, setIsWindowOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null)
  const [windowData, setWindowData] = useState<WindowArticleData | null>(null)
  const [windowLoading, setWindowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ComponentKey>("MIDSOLE")

  // Inline Add Round Form State inside Article Window
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false)
  const [addRoundForm, setAddRoundForm] = useState({
    confirmDate: format(new Date(), "yyyy-MM-dd"),
    targetColor: "",
    supplierColor: "",
    supplier: "",
    projectDev: "",
    notes: "",
  })

  // Edit Developer & Vendor Modal State for Article
  const [isEditDevVendorOpen, setIsEditDevVendorOpen] = useState(false)
  const [editProjectDev, setEditProjectDev] = useState("")
  const [editSupplier, setEditSupplier] = useState("")

  // ==========================================
  // COMMON DIALOGS: REVIEW, DELETE, PICKER
  // ==========================================
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [selectedRoundForReview, setSelectedRoundForReview] = useState<RoundDetail | null>(null)
  const [reviewStatus, setReviewStatus] = useState("APPROVED")
  const [reviewFeedback, setReviewFeedback] = useState("")
  const [reviewProjectDev, setReviewProjectDev] = useState("")

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [isArticlePickerOpen, setIsArticlePickerOpen] = useState(false)
  const [pickerSearchQuery, setPickerSearchQuery] = useState("")

  const [isPending, startTransition] = useTransition()

  // Active Tab Driven Fetching for maximum performance
  const fetchData = useCallback(async (forcedView?: "BY_COMPONENT" | "BY_ARTICLE") => {
    const currentView = forcedView || viewMode
    setLoading(true)
    try {
      if (currentView === "BY_COMPONENT") {
        const compRes = await getGroupedComponentColorSummaries({
          search: appliedSearch,
          statusFilter,
          componentFilter,
        })
        setComponentGroups(compRes.summaries)
        setCompStats(compRes.stats)
        if (compRes.totalArticles && stats.total === 0) {
          setStats(prev => ({ ...prev, total: compRes.totalArticles }))
        }
      } else {
        const artRes = await getGroupedConformArticles({
          search: appliedSearch,
          statusFilter,
        })
        setArticles(artRes.summaries)
        setStats(artRes.stats)
      }
    } catch (err) {
      console.error(err)
      toast.error("Gagal memuat data Color Conform")
    } finally {
      setLoading(false)
    }
  }, [viewMode, appliedSearch, statusFilter, componentFilter, stats.total])

  // Lazy-load article picker options only when opened
  const handleOpenArticlePicker = async () => {
    setIsArticlePickerOpen(true)
    if (trackingArticles.length === 0) {
      try {
        const data = await getArticlesFromTracking()
        setTrackingArticles(data as unknown as TrackingArticleOption[])
      } catch (err) {
        console.error("Gagal memuat artikel tracking", err)
      }
    }
  }

  // Switch tab with instant responsiveness
  const handleSwitchView = (newMode: "BY_COMPONENT" | "BY_ARTICLE") => {
    if (newMode === viewMode) return
    setViewMode(newMode)
    if (newMode === "BY_ARTICLE" && articles.length === 0) {
      fetchData("BY_ARTICLE")
    } else if (newMode === "BY_COMPONENT" && componentGroups.length === 0) {
      fetchData("BY_COMPONENT")
    }
  }

  useEffect(() => {
    fetchData()
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
      setViewMode("BY_ARTICLE")
      handleOpenWindow(initialArticle)
    }
  }, [initialArticle, selectedArticle, handleOpenWindow])

  // Reload active article window data
  const reloadWindowData = async (articleCode: string) => {
    try {
      const data = await getArticleConformDetails(articleCode)
      setWindowData(data as unknown as WindowArticleData)
    } catch (err) {
      console.error(err)
    }
  }

  // Open Component Group Window
  const handleOpenCompGroupWindow = useCallback(async (groupId: string) => {
    setIsCompGroupWindowOpen(true)
    setIsCompGroupAddRoundOpen(false)
    setCompGroupWindowLoading(true)
    try {
      const data = await getComponentColorGroupDetails(groupId)
      setCompGroupWindowData(data as unknown as ComponentColorGroupData)
      setReviewProjectDev(data.projectDev && data.projectDev !== "-" ? data.projectDev : "")
    } catch (err) {
      console.error(err)
      toast.error("Gagal memuat detail komponen")
    } finally {
      setCompGroupWindowLoading(false)
    }
  }, [])

  // Reload active component group window data
  const reloadCompGroupWindowData = async (groupId: string) => {
    try {
      const data = await getComponentColorGroupDetails(groupId)
      setCompGroupWindowData(data as unknown as ComponentColorGroupData)
    } catch (err) {
      console.error(err)
    }
  }

  // Component Group: Open Add Round
  const handleOpenCompGroupAddRound = () => {
    if (!compGroupWindowData) return
    setCompGroupAddRoundForm({
      confirmDate: format(new Date(), "yyyy-MM-dd"),
      targetColor: compGroupWindowData.targetColor !== "-" ? compGroupWindowData.targetColor : "",
      supplierColor: "",
      supplier: compGroupWindowData.defaultSupplier || "",
      projectDev: compGroupWindowData.projectDev !== "-" ? compGroupWindowData.projectDev : "",
      notes: "",
    })
    setIsCompGroupAddRoundOpen(true)
  }

  // Component Group: Submit Add Round
  const handleSubmitCompGroupAddRound = (e: React.FormEvent) => {
    e.preventDefault()
    if (!compGroupWindowData) return
    if (!compGroupAddRoundForm.targetColor.trim()) {
      toast.error("Target Color wajib diisi")
      return
    }

    startTransition(async () => {
      try {
        const res = await submitSharedComponentColorRound({
          modelName: compGroupWindowData.modelName,
          component: compGroupWindowData.component,
          targetColor: compGroupAddRoundForm.targetColor.trim(),
          supplierColor: compGroupAddRoundForm.supplierColor.trim() || undefined,
          supplier: compGroupAddRoundForm.supplier.trim() || undefined,
          projectDev: compGroupAddRoundForm.projectDev.trim() || (compGroupWindowData.projectDev !== "-" ? compGroupWindowData.projectDev : "-"),
          confirmDate: new Date(compGroupAddRoundForm.confirmDate),
          notes: compGroupAddRoundForm.notes.trim() || undefined,
          articles: compGroupWindowData.articles.map(a => a.article),
        })

        if (res.success) {
          toast.success(res.message)
          setIsCompGroupAddRoundOpen(false)
          reloadCompGroupWindowData(compGroupWindowData.id)
          fetchData()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal menambahkan round CFM")
      }
    })
  }

  // Component Group: Open Edit Dev & Vendor
  const handleOpenCompGroupEditDevVendor = () => {
    if (!compGroupWindowData) return
    setCompGroupEditDev(compGroupWindowData.projectDev && compGroupWindowData.projectDev !== "-" ? compGroupWindowData.projectDev : "")
    setCompGroupEditSupplier(compGroupWindowData.defaultSupplier && compGroupWindowData.defaultSupplier !== "-" ? compGroupWindowData.defaultSupplier : "")
    setIsCompGroupEditDevVendorOpen(true)
  }

  // Component Group: Save Edit Dev & Vendor
  const handleSaveCompGroupDevVendor = () => {
    if (!compGroupWindowData) return
    startTransition(async () => {
      try {
        const res = await updateComponentGroupDevAndSupplier({
          modelName: compGroupWindowData.modelName,
          component: compGroupWindowData.component,
          targetColor: compGroupWindowData.targetColor,
          projectDev: compGroupEditDev.trim() || "-",
          supplier: compGroupEditSupplier.trim() || undefined,
          articles: compGroupWindowData.articles.map(a => a.article),
        })
        if (res.success) {
          toast.success(res.message)
          setIsCompGroupEditDevVendorOpen(false)
          reloadCompGroupWindowData(compGroupWindowData.id)
          fetchData()
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal memperbarui developer & vendor")
      }
    })
  }

  // Article Window: Switch Component Tab
  const handleSelectTab = (tab: ComponentKey) => {
    setActiveTab(tab)
    setIsAddRoundOpen(false)
  }

  // Article Window: Open Edit Dev/Vendor
  const handleOpenEditDevVendor = () => {
    if (!windowData) return
    setEditProjectDev(windowData.projectDev && windowData.projectDev !== "-" ? windowData.projectDev : "")
    setEditSupplier(windowData.defaultSupplier && windowData.defaultSupplier !== "-" ? windowData.defaultSupplier : "")
    setIsEditDevVendorOpen(true)
  }

  // Article Window: Save Dev/Vendor
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

  // Article Window: Open Add Round
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

  // Article Window: Submit Add Round
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

  // Open Review Dialog for a specific round (usable from both windows)
  const handleOpenReview = (round: RoundDetail) => {
    setSelectedRoundForReview(round)
    setReviewStatus(round.status === "PENDING" ? "APPROVED" : round.status)
    setReviewFeedback(round.devFeedback || "")
    setReviewProjectDev(
      round.projectDev && round.projectDev !== "-"
        ? round.projectDev
        : (compGroupWindowData?.projectDev && compGroupWindowData.projectDev !== "-"
            ? compGroupWindowData.projectDev
            : (windowData?.projectDev && windowData.projectDev !== "-" ? windowData.projectDev : ""))
    )
    setIsReviewOpen(true)
  }

  // Submit Review Decision
  const handleSubmitReview = () => {
    if (!selectedRoundForReview) return

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
          if (windowData) reloadWindowData(windowData.article)
          if (compGroupWindowData) reloadCompGroupWindowData(compGroupWindowData.id)
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
        if (compGroupWindowData) await reloadCompGroupWindowData(compGroupWindowData.id)
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
              Konfirmasi warna efisien per komponen (Midsole, Outsole, Wedge, CR) yang dapat dipakai bersama antar artikel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          {canManage && (
            <Button
              onClick={handleOpenArticlePicker}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4" />
              New Color Conform
            </Button>
          )}
        </div>
      </div>

      {/* DUAL-VIEW SWITCHER TABS */}
      <div className="flex border-b border-border bg-muted/20 rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => handleSwitchView("BY_COMPONENT")}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer",
            viewMode === "BY_COMPONENT"
              ? "bg-white dark:bg-card text-indigo-600 dark:text-indigo-400 shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Layers className="h-4 w-4 shrink-0 text-indigo-500" />
          <span>Per Komponen & Warna (Shared)</span>
          <Badge
            variant={viewMode === "BY_COMPONENT" ? "default" : "secondary"}
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 rounded-full",
              viewMode === "BY_COMPONENT" ? "bg-indigo-600 text-white" : ""
            )}
          >
            {compStats.total}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchView("BY_ARTICLE")}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer",
            viewMode === "BY_ARTICLE"
              ? "bg-white dark:bg-card text-indigo-600 dark:text-indigo-400 shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Palette className="h-4 w-4 shrink-0 text-indigo-500" />
          <span>Monitoring Per Artikel</span>
          <Badge
            variant={viewMode === "BY_ARTICLE" ? "default" : "secondary"}
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 rounded-full",
              viewMode === "BY_ARTICLE" ? "bg-indigo-600 text-white" : ""
            )}
          >
            {stats.total}
          </Badge>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: PER KOMPONEN & WARNA (SHARED CFM) */}
      {/* ========================================================================= */}
      {viewMode === "BY_COMPONENT" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* STATS OVERVIEW CARDS (BY COMPONENT) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="shadow-xs border bg-card/60">
              <CardContent className="p-3.5 space-y-1">
                <div className="text-xs text-muted-foreground font-medium">Total Komponen & Warna</div>
                <div className="text-2xl font-bold text-foreground">{compStats.total}</div>
                <div className="text-[10px] text-muted-foreground">Kombinasi model & warna</div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900">
              <CardContent className="p-3.5 space-y-1">
                <div className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">Ada CFM</div>
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{compStats.submitted}</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Sudah diajukan sample</div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <CardContent className="p-3.5 space-y-1">
                <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Pending Review PD
                </div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{compStats.pending}</div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400">Menunggu keputusan</div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-3.5 space-y-1">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approved
                </div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{compStats.approved}</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Warna disetujui PD</div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900">
              <CardContent className="p-3.5 space-y-1">
                <div className="text-xs text-red-700 dark:text-red-400 font-medium flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  Rejected / Revise
                </div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{compStats.rejected}</div>
                <div className="text-[10px] text-red-600 dark:text-red-400">Perlu sample ulang</div>
              </CardContent>
            </Card>
          </div>

          {/* FILTER & SEARCH BAR (BY COMPONENT) */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari warna, model, vendor, developer, artikel..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearch()
                    }
                  }}
                  className="pl-9 pr-8 h-9 text-xs"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Hapus pencarian"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleSearch}
                className="h-9 px-3.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5 shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                Cari
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              {/* Component Filter Buttons */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border">
                {[
                  { id: "ALL", label: "Semua Komp" },
                  { id: "MIDSOLE", label: "Midsole" },
                  { id: "OUTSOLE", label: "Outsole" },
                  { id: "WEDGE", label: "Wedge" },
                  { id: "CR", label: "CR Device" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setComponentFilter(c.id)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md font-medium transition-all",
                      componentFilter === c.id
                        ? "bg-white dark:bg-card text-foreground shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1">
                {[
                  { id: "ALL", label: "Semua Status" },
                  { id: "SUBMITTED", label: "Ada CFM" },
                  { id: "PENDING", label: "Pending" },
                  { id: "ALL_APPROVED", label: "Approved" },
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
          </div>

          {/* TABLE: PER KOMPONEN & WARNA */}
          <Card className="shadow-xs overflow-hidden border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[280px] pl-4">Komponen & Target Warna</TableHead>
                    <TableHead className="min-w-[280px]">Digunakan di Artikel (Shared)</TableHead>
                    <TableHead className="w-[220px]">Status & Putaran CFM</TableHead>
                    <TableHead className="w-[130px] text-right pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                          <span className="text-xs text-muted-foreground">Memuat data komponen dan warna...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : componentGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                        Tidak ada komponen atau warna yang cocok dengan filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    componentGroups.map((group) => {
                      const cfg = COMPONENT_CONFIG[group.component as ComponentKey] || COMPONENT_CONFIG.MIDSOLE
                      const statusCfg = STATUS_CONFIG[group.status] || STATUS_CONFIG.NOT_SUBMITTED

                      return (
                        <TableRow
                          key={group.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {/* 1. KOMPONEN & TARGET WARNA */}
                          <TableCell className="align-middle py-3.5 pl-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={cn("text-[11px] font-bold px-2 py-0.5 rounded gap-1", cfg.badge)}
                                >
                                  {cfg.dotColor && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotColor)} />}
                                  {cfg.label}
                                </Badge>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Model: <strong className="text-foreground">{group.modelName}</strong>
                                </span>
                              </div>

                              <div className="font-extrabold text-sm text-foreground uppercase tracking-wide">
                                {group.targetColor}
                              </div>

                              <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span>Dev: <strong className="text-foreground">{group.projectDev !== "-" ? group.projectDev : "Belum diset"}</strong></span>
                                {group.defaultSupplier && (
                                  <span>• Vendor: <strong className="text-foreground">{group.defaultSupplier}</strong></span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 2. DIGUNAKAN DI ARTIKEL (SHARED) */}
                          <TableCell className="align-middle py-3.5">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-indigo-600" />
                                <span className="text-xs font-semibold text-foreground">
                                  Digunakan di {group.articles.length} Artikel:
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5 items-center">
                                {group.articles.slice(0, 4).map((art) => (
                                  <span
                                    key={art.article}
                                    title={`Artikel ${art.article} (Model ${group.modelName})`}
                                    className="font-mono text-[11px] font-bold text-foreground bg-muted/80 hover:bg-muted px-2 py-0.5 rounded border border-border/80 flex items-center gap-1 transition-colors"
                                  >
                                    {art.article}
                                  </span>
                                ))}
                                {group.articles.length > 4 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-semibold">
                                    +{group.articles.length - 4} artikel lagi
                                  </Badge>
                                )}
                              </div>

                              <p className="text-[10px] text-muted-foreground italic">
                                Cukup 1x CFM untuk seluruh {group.articles.length} artikel di atas.
                              </p>
                            </div>
                          </TableCell>

                          {/* 3. STATUS & PUTARAN CFM */}
                          <TableCell className="align-middle py-3.5">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn("text-[11px] font-semibold gap-1.5 px-2.5 py-0.5 rounded-full", statusCfg.color, statusCfg.bg)}
                                >
                                  <statusCfg.icon className="h-3 w-3" />
                                  {statusCfg.label}
                                </Badge>
                              </div>

                              <div className="text-xs font-medium text-foreground">
                                {group.roundsCount > 0 ? (
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                    Round #{group.latestRoundNo} ({group.roundsCount} Putaran)
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">Belum ada pengajuan</span>
                                )}
                              </div>

                              {group.latestConfirmDate && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(group.latestConfirmDate), "dd MMM yyyy", { locale: localeId })}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* 4. AKSI: KELOLA CFM */}
                          <TableCell className="align-middle py-3.5 text-right pr-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCompGroupWindow(group.id)}
                              className="h-9 px-3 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 dark:border-indigo-800 gap-1.5 shadow-xs font-semibold rounded-lg"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Kelola CFM
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MONITORING PER ARTIKEL (4 KOMPONEN READINESS) */}
      {/* ========================================================================= */}
      {viewMode === "BY_ARTICLE" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* STATS OVERVIEW CARDS (BY ARTICLE) */}
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

          {/* FILTER & SEARCH BAR (BY ARTICLE) */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari artikel, model, vendor, developer..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearch()
                    }
                  }}
                  className="pl-9 pr-8 h-9 text-xs"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Hapus pencarian"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleSearch}
                className="h-9 px-3.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5 shrink-0"
              >
                <Search className="h-3.5 w-3.5" />
                Cari
              </Button>
            </div>

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
                          <span className="text-xs text-muted-foreground">Memuat data konfirmasi warna artikel...</span>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* WINDOWED MODAL 1: COMPONENT GROUP WINDOW (SHARED PER-COMPONENT CFM) */}
      {/* ========================================================================= */}
      <Dialog open={isCompGroupWindowOpen} onOpenChange={setIsCompGroupWindowOpen}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto p-0 bg-background border shadow-2xl rounded-xl">
          {compGroupWindowLoading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-xs text-muted-foreground font-medium">Memuat data komponen bersama...</p>
            </div>
          ) : !compGroupWindowData ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Data komponen tidak ditemukan.
            </div>
          ) : (
            <div>
              {/* COMPONENT GROUP WINDOW HEADER */}
              <div className="p-5 border-b bg-background space-y-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-bold px-2.5 py-1 rounded gap-1", COMPONENT_CONFIG[compGroupWindowData.component].badge)}
                      >
                        {COMPONENT_CONFIG[compGroupWindowData.component].label} ({COMPONENT_CONFIG[compGroupWindowData.component].short})
                      </Badge>
                      <span className="font-extrabold text-lg text-foreground uppercase tracking-wide">
                        {compGroupWindowData.targetColor}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        Model: <strong className="text-foreground">{compGroupWindowData.modelName}</strong>
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>Project Developer: <strong className="text-foreground font-semibold">{compGroupWindowData.projectDev !== "-" ? compGroupWindowData.projectDev : "Belum diset"}</strong></span>
                      <span>• Supplier: <strong className="text-foreground font-semibold">{compGroupWindowData.defaultSupplier || "-"}</strong></span>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleOpenCompGroupEditDevVendor}
                          className="h-5 px-1.5 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1 font-semibold rounded border border-indigo-200 dark:border-indigo-800 ml-1"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                          Ubah
                        </Button>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold gap-1.5 px-3 py-1 rounded-full",
                      STATUS_CONFIG[compGroupWindowData.currentStatus]?.color,
                      STATUS_CONFIG[compGroupWindowData.currentStatus]?.bg
                    )}
                  >
                    {STATUS_CONFIG[compGroupWindowData.currentStatus]?.label || "Belum Diajukan"}
                  </Badge>
                </div>

                {/* BANNER OF CONNECTED / SHARED ARTICLES */}
                <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>1 Kali Konfirmasi Ini Berlaku Otomatis untuk Semua ({compGroupWindowData.articles.length}) Artikel Berikut:</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {compGroupWindowData.articles.map((art) => (
                      <div
                        key={art.article}
                        className="flex items-center gap-2 bg-white dark:bg-card border border-indigo-200 dark:border-indigo-800/80 rounded-lg p-1.5 pr-2.5 shadow-2xs"
                      >
                        {art.imageUrl ? (
                          <img
                            src={art.imageUrl}
                            alt={art.article}
                            className="w-6 h-6 rounded object-cover border"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded bg-muted/60 flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                            👟
                          </div>
                        )}
                        <span className="font-mono text-xs font-bold text-foreground">
                          {art.article}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* COMPONENT GROUP WINDOW BODY: TIMELINE & SUBMIT */}
              <div className="p-5 space-y-6">
                {/* ACTION: ADD NEW ROUND BUTTON */}
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    RIWAYAT PUTARAN CFM ({compGroupWindowData.rounds.length})
                  </h4>

                  {canManage && !isCompGroupAddRoundOpen && (
                    <Button
                      size="sm"
                      onClick={handleOpenCompGroupAddRound}
                      className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold rounded-lg"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {compGroupWindowData.rounds.length === 0 ? `Ajukan 1st CFM ${COMPONENT_CONFIG[compGroupWindowData.component].short}` : `+ Ajukan Round #${compGroupWindowData.rounds.length + 1}`}
                    </Button>
                  )}
                </div>

                {/* INLINE FORM: SUBMIT NEW ROUND FOR COMPONENT GROUP */}
                {isCompGroupAddRoundOpen && (
                  <Card className="border-2 border-indigo-500 shadow-md bg-indigo-50/20 dark:bg-indigo-950/20">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-bold flex items-center justify-between">
                        <span className="text-indigo-700 dark:text-indigo-300">
                          Form Pengajuan CFM Round #{compGroupWindowData.rounds.length + 1} ({COMPONENT_CONFIG[compGroupWindowData.component].label})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsCompGroupAddRoundOpen(false)}
                          className="h-6 px-2 text-xs"
                        >
                          Batal
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <form onSubmit={handleSubmitCompGroupAddRound} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Tanggal Pengajuan</Label>
                            <Input
                              type="date"
                              value={compGroupAddRoundForm.confirmDate}
                              onChange={(e) => setCompGroupAddRoundForm(prev => ({ ...prev, confirmDate: e.target.value }))}
                              className="h-8 text-xs"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Project Developer (PD)</Label>
                            <Input
                              placeholder="Nama Project Developer"
                              value={compGroupAddRoundForm.projectDev}
                              onChange={(e) => setCompGroupAddRoundForm(prev => ({ ...prev, projectDev: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Vendor / Supplier</Label>
                            <Input
                              placeholder="Nama vendor komponen ini"
                              value={compGroupAddRoundForm.supplier}
                              onChange={(e) => setCompGroupAddRoundForm(prev => ({ ...prev, supplier: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Target Color (Standar PO)</Label>
                            <Input
                              placeholder="e.g. SEA SALT"
                              value={compGroupAddRoundForm.targetColor}
                              onChange={(e) => setCompGroupAddRoundForm(prev => ({ ...prev, targetColor: e.target.value }))}
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
                              value={compGroupAddRoundForm.supplierColor}
                              onChange={(e) => setCompGroupAddRoundForm(prev => ({ ...prev, supplierColor: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Catatan Pengajuan</Label>
                          <Textarea
                            placeholder="Contoh: Sampel batch lab dip dari vendor, berlaku untuk semua artikel model ini..."
                            rows={2}
                            value={compGroupAddRoundForm.notes}
                            onChange={(e) => setCompGroupAddRoundForm(prev => ({ ...prev, notes: e.target.value }))}
                            className="text-xs"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCompGroupAddRoundOpen(false)}
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
                            Kirim Pengajuan Round #{compGroupWindowData.rounds.length + 1}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* TIMELINE OF ROUNDS */}
                {compGroupWindowData.rounds.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/20 dark:bg-slate-900/10">
                    <Clock className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                    <p className="text-xs text-muted-foreground font-normal">
                      Belum ada pengajuan CFM untuk komponen {COMPONENT_CONFIG[compGroupWindowData.component].label} ({compGroupWindowData.targetColor}).
                    </p>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenCompGroupAddRound}
                        className="text-xs gap-1.5 font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xs h-8 hover:bg-slate-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajukan 1st CFM Sekarang
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-indigo-200 dark:before:bg-indigo-900/60">
                    {[...compGroupWindowData.rounds].reverse().map((round, idx) => {
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

              {/* COMPONENT GROUP WINDOW FOOTER */}
              <div className="p-4 border-t bg-muted/20 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCompGroupWindowOpen(false)}
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
      {/* WINDOWED MODAL 2: ARTICLE WINDOW (PER-ARTICLE MULTI-ROUND TIMELINE) */}
      {/* ========================================================================= */}
      <Dialog open={isWindowOpen} onOpenChange={setIsWindowOpen}>
        <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto p-0 bg-background border shadow-2xl rounded-xl">
          {windowLoading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-xs text-muted-foreground font-medium">Memuat data Color Conform artikel...</p>
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
                          "flex flex-col items-start p-3 rounded-xl border text-left transition-all relative cursor-pointer",
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

                        {/* SHARED COMPONENT ALERT NOTICE */}
                        {compData.sharedArticles && compData.sharedArticles.length > 1 && (
                          <div className="p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 flex items-start gap-2 text-xs text-indigo-900 dark:text-indigo-200">
                            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold">Komponen Bersama:</strong> Warna{" "}
                              <strong className="uppercase">{compData.targetColor}</strong> pada model{" "}
                              <strong>{windowData.modelName}</strong> digunakan bersama oleh{" "}
                              <strong>{compData.sharedArticles.length} artikel</strong> ({compData.sharedArticles.join(", ")}).
                              Setiap input dan hasil review di sini otomatis sinkron untuk semua artikel tersebut.
                            </div>
                          </div>
                        )}

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
        <DialogContent className="sm:max-w-xl md:max-w-2xl w-[94vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Keputusan Project Developer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tentukan hasil evaluasi warna untuk {selectedRoundForReview?.component} round #{selectedRoundForReview?.roundNo}{" "}
              {windowData?.article ? `artikel ${windowData.article}` : compGroupWindowData?.modelName ? `(Model ${compGroupWindowData.modelName} - ${compGroupWindowData.targetColor})` : ""}.
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
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Keputusan</Label>
              <Select value={reviewStatus} onValueChange={(val) => { if (val) setReviewStatus(val) }}>
                <SelectTrigger className="w-full h-9 text-xs flex justify-between">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[var(--anchor-width)] min-w-[360px] max-w-[95vw] text-xs">
                  <SelectItem value="APPROVED" className="text-xs py-2 cursor-pointer">
                    ✅ APPROVED (Disetujui / OK to Proceed)
                  </SelectItem>
                  <SelectItem value="APPROVED_WITH_NOTE" className="text-xs py-2 cursor-pointer">
                    ℹ️ APPROVED WITH NOTE (Disetujui Bersyarat)
                  </SelectItem>
                  <SelectItem value="REJECTED" className="text-xs py-2 cursor-pointer">
                    ❌ REJECTED / REVISE (Ditolak / Minta Kirim Ulang)
                  </SelectItem>
                  <SelectItem value="PENDING" className="text-xs py-2 cursor-pointer">
                    ⏳ PENDING (Masih Menunggu Evaluasi)
                  </SelectItem>
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
        <DialogContent className="sm:max-w-lg md:max-w-xl w-[92vw]">
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
        <DialogContent className="sm:max-w-lg w-[92vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-indigo-600" />
              Kustomisasi Developer & Vendor Artikel
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
      {/* DIALOG: EDIT DEVELOPER & VENDOR KOMPONEN GROUP */}
      {/* ========================================================================= */}
      <Dialog open={isCompGroupEditDevVendorOpen} onOpenChange={setIsCompGroupEditDevVendorOpen}>
        <DialogContent className="sm:max-w-lg w-[92vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-indigo-600" />
              Kustomisasi Developer & Vendor Komponen
            </DialogTitle>
            <DialogDescription>
              Atur Project Developer dan Supplier/Vendor untuk komponen{" "}
              <strong className="text-foreground">{compGroupWindowData?.component} ({compGroupWindowData?.targetColor})</strong> Model <strong>{compGroupWindowData?.modelName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Project Developer (PD)</Label>
              <Input
                placeholder="Misal: Budi (PD) / Team PD..."
                value={compGroupEditDev}
                onChange={(e) => setCompGroupEditDev(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Nama developer in charge untuk peninjauan swatch/lab dip warna komponen ini.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supplier / Vendor Komponen</Label>
              <Input
                placeholder="Misal: Pou Chen / Feng Tay..."
                value={compGroupEditSupplier}
                onChange={(e) => setCompGroupEditSupplier(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Vendor yang menyuplai komponen dan sample warna ini.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCompGroupEditDevVendorOpen(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCompGroupDevVendor}
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
