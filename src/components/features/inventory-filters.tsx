"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Filter,
  X,
  SlidersHorizontal,
  RotateCcw,
  Check,
  ChevronDown,
} from "lucide-react"

export function InventoryFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Track panel open/close
  const [isOpen, setIsOpen] = useState(false)

  // Local state for filter fields
  const [model, setModel] = useState(searchParams.get("model") || "")
  const [article, setArticle] = useState(searchParams.get("article") || "")
  const [color, setColor] = useState(searchParams.get("color") || "")
  const [size, setSize] = useState(searchParams.get("size") || "")
  const [poNumber, setPoNumber] = useState(searchParams.get("poNumber") || "")
  const [soleType, setSoleType] = useState(searchParams.get("soleType") || "all")
  const [bottomTreatment, setBottomTreatment] = useState(
    searchParams.get("bottomTreatment") || "all"
  )

  // Sync state when URL searchParams change
  useEffect(() => {
    setModel(searchParams.get("model") || "")
    setArticle(searchParams.get("article") || "")
    setColor(searchParams.get("color") || "")
    setSize(searchParams.get("size") || "")
    setPoNumber(searchParams.get("poNumber") || "")
    setSoleType(searchParams.get("soleType") || "all")
    setBottomTreatment(searchParams.get("bottomTreatment") || "all")
  }, [searchParams])

  // Count active specific filters (excluding search & status which have own UI, but counted for badge)
  const activeFiltersCount = [
    searchParams.get("model"),
    searchParams.get("article"),
    searchParams.get("color"),
    searchParams.get("size"),
    searchParams.get("poNumber"),
    searchParams.get("soleType"),
    searchParams.get("bottomTreatment"),
  ].filter(Boolean).length

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())

    if (model.trim()) params.set("model", model.trim())
    else params.delete("model")

    if (article.trim()) params.set("article", article.trim())
    else params.delete("article")

    if (color.trim()) params.set("color", color.trim())
    else params.delete("color")

    if (size.trim()) params.set("size", size.trim())
    else params.delete("size")

    if (poNumber.trim()) params.set("poNumber", poNumber.trim())
    else params.delete("poNumber")

    if (soleType && soleType !== "all") params.set("soleType", soleType)
    else params.delete("soleType")

    if (bottomTreatment && bottomTreatment !== "all")
      params.set("bottomTreatment", bottomTreatment)
    else params.delete("bottomTreatment")

    params.set("page", "1")

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
      setIsOpen(false)
    })
  }

  const handleResetForm = () => {
    setModel("")
    setArticle("")
    setColor("")
    setSize("")
    setPoNumber("")
    setSoleType("all")
    setBottomTreatment("all")

    const params = new URLSearchParams(searchParams.toString())
    params.delete("model")
    params.delete("article")
    params.delete("color")
    params.delete("size")
    params.delete("poNumber")
    params.delete("soleType")
    params.delete("bottomTreatment")
    params.set("page", "1")

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
      setIsOpen(false)
    })
  }

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <Button
        type="button"
        variant={activeFiltersCount > 0 ? "default" : "outline"}
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 gap-2 whitespace-nowrap bg-white dark:bg-gray-800"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>Filter</span>
        {activeFiltersCount > 0 && (
          <Badge
            variant="secondary"
            className="px-1.5 py-0 h-4 text-[10px] font-bold rounded-full bg-primary-foreground text-primary"
          >
            {activeFiltersCount}
          </Badge>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {/* Expandable Filter Card Popover / Panel */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-[320px] sm:w-[460px] p-4 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">Filter Pencarian Spesifik</h4>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleApply} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Model */}
              <div className="space-y-1">
                <Label htmlFor="filter-model" className="text-xs font-medium">
                  Model
                </Label>
                <Input
                  id="filter-model"
                  placeholder="Contoh: 603, W603"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="h-8 text-xs bg-slate-50 dark:bg-gray-900"
                />
              </div>

              {/* Article */}
              <div className="space-y-1">
                <Label htmlFor="filter-article" className="text-xs font-medium">
                  Article
                </Label>
                <Input
                  id="filter-article"
                  placeholder="Contoh: 9DJ, 7F0"
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  className="h-8 text-xs bg-slate-50 dark:bg-gray-900"
                />
              </div>

              {/* Color */}
              <div className="space-y-1">
                <Label htmlFor="filter-color" className="text-xs font-medium">
                  Warna / Color
                </Label>
                <Input
                  id="filter-color"
                  placeholder="Contoh: WHITE, SEA SALT"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 text-xs bg-slate-50 dark:bg-gray-900"
                />
              </div>

              {/* Size */}
              <div className="space-y-1">
                <Label htmlFor="filter-size" className="text-xs font-medium">
                  Size / Ukuran
                </Label>
                <Input
                  id="filter-size"
                  placeholder="Contoh: 5T, 8, 10T"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="h-8 text-xs bg-slate-50 dark:bg-gray-900"
                />
              </div>

              {/* PO Number */}
              <div className="space-y-1">
                <Label htmlFor="filter-po" className="text-xs font-medium">
                  PO Number
                </Label>
                <Input
                  id="filter-po"
                  placeholder="Contoh: PO-1234"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="h-8 text-xs bg-slate-50 dark:bg-gray-900"
                />
              </div>

              {/* Sole Type */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Jenis Sol</Label>
                <Select value={soleType} onValueChange={(val) => setSoleType(val || "all")}>
                  <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-gray-900">
                    <SelectValue placeholder="Semua Jenis Sol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis Sol</SelectItem>
                    <SelectItem value="After Stockfit">After Stockfit</SelectItem>
                    <SelectItem value="Component">Component</SelectItem>
                    <SelectItem value="Lokal">Lokal</SelectItem>
                    <SelectItem value="Import">Import</SelectItem>
                    <SelectItem value="Unisole">Unisole</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bottom Treatment */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium">Bottom Treatment</Label>
                <Select
                  value={bottomTreatment}
                  onValueChange={(val) => setBottomTreatment(val || "all")}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-gray-900">
                    <SelectValue placeholder="Semua Treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Treatment</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Spray">Spray</SelectItem>
                    <SelectItem value="Buffing">Buffing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-gray-700">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetForm}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs px-4" disabled={isPending}>
                <Check className="h-3.5 w-3.5 mr-1" />
                {isPending ? "Menerapkan..." : "Terapkan Filter"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/**
 * Active filter chips bar rendered directly above the inventory table.
 * Shows each applied criterion with a 1-click remove button, and a Clear All option.
 */
export function ActiveFilterChips() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const search = searchParams.get("search") || ""
  const model = searchParams.get("model") || ""
  const article = searchParams.get("article") || ""
  const color = searchParams.get("color") || ""
  const size = searchParams.get("size") || ""
  const poNumber = searchParams.get("poNumber") || ""
  const soleType = searchParams.get("soleType") || ""
  const bottomTreatment = searchParams.get("bottomTreatment") || ""
  const status = searchParams.get("status") || ""

  const activeFilters = [
    search ? { key: "search", label: `Pencarian: "${search}"` } : null,
    model ? { key: "model", label: `Model: ${model}` } : null,
    article ? { key: "article", label: `Article: ${article}` } : null,
    color ? { key: "color", label: `Warna: ${color}` } : null,
    size ? { key: "size", label: `Size: ${size}` } : null,
    poNumber ? { key: "poNumber", label: `PO: ${poNumber}` } : null,
    soleType ? { key: "soleType", label: `Sol: ${soleType}` } : null,
    bottomTreatment ? { key: "bottomTreatment", label: `Bottom: ${bottomTreatment}` } : null,
    status && status !== "all"
      ? {
          key: "status",
          label: `Status: ${status === "lowstock" ? "Low Stock" : "In Stock"}`,
        }
      : null,
  ].filter(Boolean) as { key: string; label: string }[]

  if (activeFilters.length === 0) return null

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key)
    params.set("page", "1")
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const clearAllFilters = () => {
    const params = new URLSearchParams()
    // Retain limit if set
    const limit = searchParams.get("limit")
    if (limit && limit !== "48") {
      params.set("limit", limit)
    }
    startTransition(() => {
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs text-muted-foreground">
      <span className="font-medium mr-1 text-foreground flex items-center gap-1">
        <Filter className="h-3.5 w-3.5 text-primary" /> Filter aktif:
      </span>
      {activeFilters.map((f) => (
        <Badge
          key={f.key}
          variant="secondary"
          className="h-6 gap-1.5 px-2 py-0 text-xs bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-gray-700"
        >
          <span>{f.label}</span>
          <button
            type="button"
            onClick={() => removeFilter(f.key)}
            className="hover:text-destructive rounded-full focus:outline-none"
            aria-label={`Hapus filter ${f.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clearAllFilters}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
      >
        Reset Semua
      </Button>
    </div>
  )
}

