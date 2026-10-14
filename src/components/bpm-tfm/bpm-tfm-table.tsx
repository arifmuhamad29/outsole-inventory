"use client"

import { useState, useMemo, useTransition, useEffect } from "react"
import { BpmTfmStock } from "@prisma/client"
import {
  Boxes,
  Layers,
  Loader2,
  Search,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronsUpDown,
  LayoutGrid,
  Table as TableIcon,
  Wrench,
  Filter,
  Check,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteBpmTfmStockAction, updateBpmTfmStockAction } from "@/app/actions/bpm-tfm"

interface BpmTfmTableProps {
  data: BpmTfmStock[]
  isReadOnly?: boolean
  onRefresh?: () => void
  actions?: React.ReactNode
}

interface ToolGroup {
  toolName: string
  type: string
  satuan: string
  totalStock: number
  items: BpmTfmStock[]
}

interface ModelGroup {
  key: string
  modelName: string
  gender?: string
  codeLast?: string
  totalItems: number
  totalStock: number
  tools: ToolGroup[]
  items: BpmTfmStock[]
}

// Natural size order parser (e.g. 4, 4T, 4.5, 5, 5T, ..., 10, 10T, 11)
function parseSizeToNumber(sizeStr: string): number {
  if (!sizeStr) return 0
  const s = sizeStr.trim()
  const match = s.match(/^(\d+(?:\.\d+)?)/)
  if (match) {
    let val = parseFloat(match[1])
    if (/^\d+T(?:K)?/i.test(s)) {
      val += 0.4
    }
    return val
  }
  return 99999
}

function compareSizes(a: string, b: string): number {
  const numA = parseSizeToNumber(a)
  const numB = parseSizeToNumber(b)
  if (numA !== numB) {
    return numA - numB
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
}

export function BpmTfmTable({ data, isReadOnly = false, onRefresh, actions }: BpmTfmTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedModelKey, setSelectedModelKey] = useState<string>("ALL")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({})

  const [isPending, startTransition] = useTransition()
  const [itemToDelete, setItemToDelete] = useState<BpmTfmStock | null>(null)
  const [itemToEdit, setItemToEdit] = useState<BpmTfmStock | null>(null)
  const [editStockValue, setEditStockValue] = useState("")

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (searchQuery.trim() === "") return data
    const q = searchQuery.toLowerCase().trim()
    return data.filter((s) => {
      const modelMatch = s.modelName && s.modelName !== "-" && s.modelName.toLowerCase().includes(q)
      const genderMatch = s.gender && s.gender !== "-" && s.gender.toLowerCase().includes(q)
      const codeMatch = s.codeLast && s.codeLast !== "-" && s.codeLast.toLowerCase().includes(q)
      const toolMatch = s.toolName && s.toolName.toLowerCase().includes(q)
      const typeMatch = s.type && s.type.toLowerCase().includes(q)
      const sizeMatch = s.size && s.size.toLowerCase().includes(q)
      return modelMatch || genderMatch || codeMatch || toolMatch || typeMatch || sizeMatch
    })
  }, [data, searchQuery])

  // Group items by Model
  const modelGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        modelName: string
        gender?: string
        codeLast?: string
        items: BpmTfmStock[]
      }
    >()

    for (const item of filteredData) {
      const hasModel = item.modelName && item.modelName.trim() !== "-" && item.modelName.trim() !== ""
      const hasCode = item.codeLast && item.codeLast.trim() !== "-" && item.codeLast.trim() !== ""

      let key = ""
      let displayModelName = ""
      let gender: string | undefined = undefined
      let codeLast: string | undefined = undefined

      if (hasModel) {
        key = item.modelName.trim()
        displayModelName = item.modelName.trim()
        if (item.gender && item.gender.trim() !== "-") gender = item.gender.trim()
        if (hasCode) codeLast = item.codeLast.trim()
      } else if (hasCode) {
        key = `CODE_${item.codeLast.trim()}`
        displayModelName = `Code Last: ${item.codeLast.trim()}`
        codeLast = item.codeLast.trim()
      } else {
        key = "GENERAL_STOCK"
        displayModelName = "General / Stock Lainnya"
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          modelName: displayModelName,
          gender,
          codeLast,
          items: [],
        })
      }
      map.get(key)!.items.push(item)
    }

    const groups: ModelGroup[] = []

    for (const [, grp] of map) {
      // Group items in this model by toolName + type
      const toolMap = new Map<
        string,
        {
          toolName: string
          type: string
          satuan: string
          items: BpmTfmStock[]
        }
      >()

      for (const item of grp.items) {
        const tKey = `${item.toolName.trim()}__${item.type?.trim() || ""}`
        if (!toolMap.has(tKey)) {
          toolMap.set(tKey, {
            toolName: item.toolName.trim(),
            type: item.type?.trim() || "",
            satuan: item.satuan || "SET",
            items: [],
          })
        }
        toolMap.get(tKey)!.items.push(item)
      }

      const tools: ToolGroup[] = []
      let modelTotalStock = 0

      for (const [, tGrp] of toolMap) {
        tGrp.items.sort((a, b) => compareSizes(a.size, b.size))
        const toolStock = tGrp.items.reduce((sum, it) => sum + it.devStock, 0)
        modelTotalStock += toolStock
        tools.push({
          toolName: tGrp.toolName,
          type: tGrp.type,
          satuan: tGrp.satuan,
          totalStock: toolStock,
          items: tGrp.items,
        })
      }

      tools.sort((a, b) => a.toolName.localeCompare(b.toolName))

      groups.push({
        key: grp.key,
        modelName: grp.modelName,
        gender: grp.gender,
        codeLast: grp.codeLast,
        totalItems: grp.items.length,
        totalStock: modelTotalStock,
        tools,
        items: grp.items,
      })
    }

    groups.sort((a, b) => a.modelName.localeCompare(b.modelName))
    return groups
  }, [filteredData])

  // Automatically expand all models by default on load or search
  useEffect(() => {
    setExpandedModels((prev) => {
      const next = { ...prev }
      modelGroups.forEach((g) => {
        if (next[g.key] === undefined) {
          next[g.key] = true
        }
      })
      return next
    })
  }, [modelGroups])

  const toggleModel = (key: string) => {
    setExpandedModels((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleExpandAll = (expand: boolean) => {
    const updated: Record<string, boolean> = {}
    modelGroups.forEach((g) => {
      updated[g.key] = expand
    })
    setExpandedModels(updated)
  }

  const handleDelete = () => {
    if (!itemToDelete) return
    startTransition(async () => {
      const res = await deleteBpmTfmStockAction(itemToDelete.id)
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

  const displayedGroups = useMemo(() => {
    if (selectedModelKey === "ALL") return modelGroups
    return modelGroups.filter((g) => g.key === selectedModelKey)
  }, [modelGroups, selectedModelKey])

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari model, nama alat, size, kode last..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-slate-50/60 border-slate-200 focus:bg-white text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Tampilan Tabel Detail"
            >
              <TableIcon className="w-3.5 h-3.5" />
              Tabel
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Tampilan Grid Ukuran"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid Ukuran
            </button>
          </div>

          {/* Expand/Collapse All Button */}
          {modelGroups.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allExpanded = modelGroups.every((g) => expandedModels[g.key])
                  handleExpandAll(!allExpanded)
                }}
                className="h-10 text-xs gap-1.5 border-slate-200 text-slate-600 hover:text-slate-900"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                {modelGroups.every((g) => expandedModels[g.key]) ? "Tutup Semua" : "Buka Semua"}
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons (Bulk Import, New Entry) */}
        {actions && <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">{actions}</div>}
      </div>

      {/* Model Filter Pills */}
      {modelGroups.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0 pr-1">
            <Filter className="w-3.5 h-3.5" />
            Model:
          </div>
          <button
            onClick={() => setSelectedModelKey("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 border ${
              selectedModelKey === "ALL"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
            }`}
          >
            Semua Model ({filteredData.length})
          </button>
          {modelGroups.map((grp) => (
            <button
              key={grp.key}
              onClick={() => setSelectedModelKey(grp.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 border flex items-center gap-1.5 ${
                selectedModelKey === grp.key
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
              }`}
            >
              <span>{grp.modelName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedModelKey === grp.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {grp.totalItems}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Summary Indicator */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
        <div>
          Menampilkan <strong className="text-slate-800">{displayedGroups.length}</strong> Model (
          <strong className="text-slate-800">{filteredData.length}</strong> data stok tooling)
        </div>
        {searchQuery && (
          <div>
            Hasil pencarian untuk: <span className="font-semibold text-primary">&quot;{searchQuery}&quot;</span>
          </div>
        )}
      </div>

      {/* Model Cards List */}
      {displayedGroups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-800 text-base">Tidak ada data tooling ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchQuery
                ? "Tidak ada model atau alat yang cocok dengan kata kunci pencarian Anda. Coba kata kunci lain."
                : "Belum ada data stok development tooling. Gunakan tombol 'Bulk Import (CSV)' atau '+ New Entry' untuk menambahkan data."}
            </p>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-2 text-xs">
                Reset Pencarian
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedGroups.map((group) => {
            const isExpanded = expandedModels[group.key] ?? true

            return (
              <div
                key={group.key}
                className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Model Header */}
                <div
                  onClick={() => toggleModel(group.key)}
                  className="p-4 md:px-5 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer bg-slate-50/50 hover:bg-slate-100/70 border-b border-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base md:text-lg tracking-tight">
                          {group.modelName}
                        </span>
                        {group.gender && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200 uppercase tracking-wider">
                            {group.gender}
                          </span>
                        )}
                        {group.codeLast && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Last: {group.codeLast}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium mt-0.5">
                        {group.tools.length} Alat Tooling • {group.totalItems} Ukuran Terdaftar
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    {/* Stock status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        group.totalStock === 0
                          ? "bg-red-50 text-red-700 border-red-200"
                          : group.totalStock <= 5
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          group.totalStock === 0
                            ? "bg-red-500"
                            : group.totalStock <= 5
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      Total Stok: {group.totalStock} SET
                    </span>

                    {/* Chevron */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-white border border-slate-200 shadow-2xs">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Model Body (Tools & Sizes) */}
                {isExpanded && (
                  <div className="p-4 md:p-5 space-y-5 animate-in fade-in-50 duration-200">
                    {group.tools.map((tool) => (
                      <div
                        key={`${tool.toolName}_${tool.type}`}
                        className="rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-2xs"
                      >
                        {/* Tool Subsection Header */}
                        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="font-bold text-slate-800 text-sm">{tool.toolName}</span>
                            {tool.type && (
                              <span className="text-[11px] font-semibold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                                {tool.type}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                            <span>{tool.items.length} Ukuran</span>
                            <span>•</span>
                            <span>
                              Total Stok:{" "}
                              <strong
                                className={tool.totalStock > 0 ? "text-emerald-700 font-bold" : "text-slate-700 font-semibold"}
                              >
                                {tool.totalStock} {tool.satuan}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* View Mode: Grid Ukuran */}
                        {viewMode === "grid" ? (
                          <div className="p-3.5 bg-slate-50/30">
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5">
                              {tool.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="group relative bg-white border border-slate-200 hover:border-primary/50 hover:shadow-xs transition-all rounded-lg p-2.5 flex flex-col justify-between gap-2 text-center"
                                >
                                  {/* Size Header */}
                                  <div className="text-xs font-bold text-slate-700">
                                    Sz: <span className="text-slate-900">{item.size}</span>
                                  </div>

                                  {/* Stock Badge */}
                                  <div>
                                    <span
                                      className={`inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer transition-transform hover:scale-105 ${
                                        item.devStock === 0
                                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                                          : item.devStock <= 2
                                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                      }`}
                                      onClick={() => {
                                        if (!isReadOnly) {
                                          setItemToEdit(item)
                                          setEditStockValue(item.devStock.toString())
                                        }
                                      }}
                                      title={isReadOnly ? `Stok: ${item.devStock}` : "Klik untuk edit stok"}
                                    >
                                      {item.devStock}
                                    </span>
                                  </div>

                                  {/* Actions for editable mode */}
                                  {!isReadOnly && (
                                    <div className="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                                      <button
                                        onClick={() => {
                                          setItemToEdit(item)
                                          setEditStockValue(item.devStock.toString())
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Edit Stok"
                                        disabled={isPending}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setItemToDelete(item)}
                                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Hapus"
                                        disabled={isPending}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* View Mode: Table Detail */
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50/40 hover:bg-slate-50/40 border-b border-slate-100">
                                  <TableHead className="font-semibold text-slate-600 text-xs w-[130px]">
                                    UKURAN (SIZE)
                                  </TableHead>
                                  {tool.type && (
                                    <TableHead className="font-semibold text-slate-600 text-xs w-[120px]">
                                      TYPE
                                    </TableHead>
                                  )}
                                  <TableHead className="font-semibold text-slate-600 text-xs text-center w-[160px]">
                                    DEV STOCK ({tool.satuan})
                                  </TableHead>
                                  <TableHead className="font-semibold text-slate-600 text-xs">
                                    LAST UPDATE
                                  </TableHead>
                                  {!isReadOnly && (
                                    <TableHead className="text-right font-semibold text-slate-600 text-xs w-[110px]">
                                      ACTION
                                    </TableHead>
                                  )}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tool.items.map((item, idx) => (
                                  <TableRow
                                    key={item.id}
                                    className={`hover:bg-slate-50/80 transition-colors ${
                                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                    }`}
                                  >
                                    <TableCell className="font-semibold text-slate-800 text-sm py-2.5">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200/80 font-mono text-xs">
                                        Sz: {item.size}
                                      </span>
                                    </TableCell>
                                    {tool.type && (
                                      <TableCell className="text-slate-600 text-xs py-2.5">
                                        {item.type || "—"}
                                      </TableCell>
                                    )}
                                    <TableCell className="text-center py-2.5">
                                      <span
                                        className={`inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                          item.devStock === 0
                                            ? "bg-red-100 text-red-700"
                                            : item.devStock <= 2
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-emerald-100 text-emerald-700"
                                        }`}
                                      >
                                        {item.devStock}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-xs py-2.5">
                                      {new Date(item.updatedAt).toLocaleDateString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </TableCell>
                                    {!isReadOnly && (
                                      <TableCell className="text-right py-2.5">
                                        <div className="flex items-center justify-end gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setItemToEdit(item)
                                              setEditStockValue(item.devStock.toString())
                                            }}
                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 h-8"
                                            disabled={isPending}
                                            title="Edit Stok"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setItemToDelete(item)}
                                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 h-8"
                                            disabled={isPending}
                                            title="Hapus Data"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      {!isReadOnly && (
        <>
          {/* Delete Dialog */}
          <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Data Stock?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini tidak dapat dibatalkan. Data stok alat{" "}
                  <strong>{itemToDelete?.toolName}</strong> ({itemToDelete?.modelName !== "-" ? itemToDelete?.modelName : `Last: ${itemToDelete?.codeLast}`}) ukuran{" "}
                  <strong>{itemToDelete?.size}</strong> akan dihapus secara permanen.
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

          {/* Edit Dialog */}
          <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Edit Dev Stock</DialogTitle>
                <DialogDescription>
                  Ubah jumlah Dev Stock untuk:
                  <br />
                  <span className="font-semibold text-slate-800">
                    {itemToEdit?.modelName !== "-" ? itemToEdit?.modelName : `Last ${itemToEdit?.codeLast}`} -{" "}
                    {itemToEdit?.toolName} {itemToEdit?.type ? `(${itemToEdit.type})` : ""}
                  </span>
                  <br />
                  Ukuran: <strong className="text-primary font-mono">Sz: {itemToEdit?.size}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Dev Stock ({itemToEdit?.satuan || "SET"})</label>
                  <Input
                    type="number"
                    min={0}
                    value={editStockValue}
                    onChange={(e) => setEditStockValue(e.target.value)}
                    disabled={isPending}
                    className="w-full text-base font-semibold"
                    autoFocus
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
