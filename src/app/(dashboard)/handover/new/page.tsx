"use client"

import { useState, useEffect } from "react"

import { useForm, useFieldArray, Controller } from "react-hook-form"
import { format } from "date-fns"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getRealTimeStock } from "@/app/actions/handover"

// Tool options for the dropdown
const TOOL_OPTIONS = [
  "3D GAUGE MARKING",
  "PAD GAUGE",
  "TOP GAUGE",
  "BOTTOM GAUGE",
  "SCREEN LINE",
  "GAUGE SPRING",
  "SOKLINER PATTERN",
  "BPM",
  "TFM",
  "UNIVERSAL PAD",
] as const

// Tools that have tracked stock in BpmTfmStock
const STOCK_TRACKED_TOOLS = ["BPM", "TFM", "UNIVERSAL PAD"]

// Tools that have Type variants
const TYPED_TOOLS = ["BPM"]

type HandoverItem = {
  toolName: string
  type: string
  size: string
  satuan: string
  qtyHandover: number
  remark: string
}

type FormValues = {
  date: string
  recipient: string
  codeLast: string
  items: HandoverItem[]
}



export default function NewHandoverPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      recipient: "",
      codeLast: "",
      items: [{ toolName: "", type: "", size: "", satuan: "SET", qtyHandover: 0, remark: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const watchedItems = watch("items")
  const globalCodeLast = watch("codeLast")
  const [stockCache, setStockCache] = useState<Record<string, { stock: number | null; loading: boolean }>>({})

  useEffect(() => {
    if (!globalCodeLast) return

    watchedItems.forEach((item) => {
      const isStockTracked = STOCK_TRACKED_TOOLS.includes(item.toolName)
      if (!isStockTracked || !item.size) return

      const cacheKey = `${globalCodeLast}-${item.toolName}-${item.type}-${item.size}`
      
      setStockCache((prev) => {
        if (prev[cacheKey] !== undefined) return prev // Already fetching or fetched
        
        getRealTimeStock(globalCodeLast, item.toolName, item.type, item.size)
          .then((stock) => {
            setStockCache((current) => ({ ...current, [cacheKey]: { stock, loading: false } }))
          })
          
        return { ...prev, [cacheKey]: { stock: null, loading: true } }
      })
    })
  }, [watchedItems, globalCodeLast])

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    // TODO: Replace with real server action in Step 2
    console.log("Handover payload:", data)
    alert(`[MOCKUP] Handover berhasil dibuat!\n\nRecipient: ${data.recipient}\nCode Last: ${data.codeLast}\nTotal Items: ${data.items.length}`)
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/handover" className="inline-flex">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Send className="w-8 h-8" />
          Buat Handover Baru
        </h1>
        <p className="text-muted-foreground mt-1">
          Catat serah terima tooling dan otomatis kurangi stok BPM/TFM/Universal Pad.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── TOP SECTION: Header Info ── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Informasi Handover
            </CardTitle>
            <CardDescription>Isi detail penerima dan Code Last yang akan diserahkan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tanggal</label>
                <Input
                  type="date"
                  {...register("date", { required: "Tanggal wajib diisi" })}
                  className="h-10 bg-white dark:bg-gray-800"
                />
                {errors.date && (
                  <p className="text-xs text-red-500 font-medium">{errors.date.message}</p>
                )}
              </div>

              {/* Recipient */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Penerima / Line</label>
                <Input
                  placeholder="e.g. LINE 3 - ASSY"
                  {...register("recipient", { required: "Penerima wajib diisi" })}
                  className="h-10 bg-white dark:bg-gray-800"
                />
                {errors.recipient && (
                  <p className="text-xs text-red-500 font-medium">{errors.recipient.message}</p>
                )}
              </div>

              {/* Code Last */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Code Last / Model Sepatu</label>
                <Input
                  placeholder="e.g. 43011"
                  {...register("codeLast", { required: "Code Last wajib diisi" })}
                  className="h-10 font-mono tracking-wider bg-white dark:bg-gray-800"
                />
                {errors.codeLast && (
                  <p className="text-xs text-red-500 font-medium">{errors.codeLast.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── ITEMS SECTION: Dynamic Table ── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Daftar Item Handover
                </CardTitle>
                <CardDescription>Tambah tool yang akan diserahkan. Stok BPM/TFM/Univ Pad akan dikurangi otomatis.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ toolName: "", type: "", size: "", satuan: "SET", qtyHandover: 0, remark: "" })}
                className="gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/5"
              >
                <Plus className="w-4 h-4" />
                Tambah Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="w-[40px] text-center font-semibold text-slate-600 dark:text-slate-400">#</TableHead>
                    <TableHead className="min-w-[180px] font-semibold text-slate-600 dark:text-slate-400">Tool Name</TableHead>
                    <TableHead className="min-w-[120px] font-semibold text-slate-600 dark:text-slate-400">Type</TableHead>
                    <TableHead className="min-w-[140px] font-semibold text-slate-600 dark:text-slate-400">Size</TableHead>
                    <TableHead className="min-w-[90px] font-semibold text-slate-600 dark:text-slate-400">Satuan</TableHead>
                    <TableHead className="min-w-[90px] font-semibold text-slate-600 dark:text-slate-400">Qty</TableHead>
                    <TableHead className="min-w-[80px] font-semibold text-slate-600 dark:text-slate-400 text-center">Stock</TableHead>
                    <TableHead className="min-w-[140px] font-semibold text-slate-600 dark:text-slate-400">Remark</TableHead>
                    <TableHead className="w-[50px] font-semibold text-slate-600 dark:text-slate-400 text-center">Hapus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const currentItem = watchedItems[index]
                    const isStockTracked = STOCK_TRACKED_TOOLS.includes(currentItem?.toolName || "")
                    const isTyped = TYPED_TOOLS.includes(currentItem?.toolName || "")
                    
                    const cacheKey = `${globalCodeLast}-${currentItem?.toolName}-${currentItem?.type}-${currentItem?.size}`
                    const stockInfo = stockCache[cacheKey]
                    const isLoadingStock = stockInfo?.loading ?? false
                    const realStock = stockInfo?.stock ?? 0
                    
                    const isOverStock = isStockTracked && !isLoadingStock && currentItem?.qtyHandover > realStock
                    const isZeroStock = isStockTracked && !isLoadingStock && realStock === 0

                    return (
                      <TableRow key={field.id} className="group">
                        {/* Row Number */}
                        <TableCell className="text-center text-sm text-slate-400 font-mono">
                          {index + 1}
                        </TableCell>

                        {/* Tool Name */}
                        <TableCell>
                          <select
                            {...register(`items.${index}.toolName` as const)}
                            className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          >
                            <option value="">-- Pilih Tool --</option>
                            {TOOL_OPTIONS.map((tool) => (
                              <option key={tool} value={tool}>
                                {tool}
                              </option>
                            ))}
                          </select>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          {isStockTracked && isTyped ? (
                            <select
                              {...register(`items.${index}.type` as const)}
                              className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            >
                              <option value="">None</option>
                              <option value="HOT">HOT</option>
                              <option value="CHILLER">CHILLER</option>
                            </select>
                          ) : (
                            <select disabled className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 opacity-40 cursor-not-allowed px-2 text-sm">
                              <option value="">-</option>
                            </select>
                          )}
                        </TableCell>

                        {/* Size */}
                        <TableCell>
                          {!isStockTracked ? (
                            <Input
                              placeholder="e.g. 5T"
                              {...register(`items.${index}.size` as const)}
                              className="h-9 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            <select
                              {...register(`items.${index}.size` as const)}
                              disabled={!globalCodeLast}
                              className={`w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${!globalCodeLast ? "bg-slate-50 dark:bg-slate-900 opacity-40 cursor-not-allowed" : "bg-white dark:bg-gray-800"}`}
                            >
                              <option value="">
                                {!globalCodeLast ? "Isi Code Last dulu" : "-- Pilih Size --"}
                              </option>
                              {globalCodeLast && (
                                <>
                                  <option value="3K-5TK">3K-5TK</option>
                                  <option value="10K-2T">10K-2T</option>
                                </>
                              )}
                            </select>
                          )}
                        </TableCell>

                        {/* Satuan */}
                        <TableCell>
                          {!isStockTracked ? (
                            <select
                              {...register(`items.${index}.satuan` as const)}
                              className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            >
                              <option value="SET">SET</option>
                              <option value="EA">EA</option>
                            </select>
                          ) : (
                            <Input
                              value="SET"
                              readOnly
                              disabled
                              className="h-9 bg-slate-50 dark:bg-slate-900 opacity-60 text-center font-medium"
                            />
                          )}
                        </TableCell>

                        {/* Qty Handover */}
                        <TableCell>
                          <Controller
                            control={control}
                            name={`items.${index}.qtyHandover`}
                            render={({ field: f }) => (
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                disabled={isStockTracked && isZeroStock}
                                value={f.value === 0 ? "" : f.value}
                                onChange={(e) => f.onChange(parseInt(e.target.value, 10) || 0)}
                                className={`h-9 text-center font-semibold bg-white dark:bg-gray-800 ${
                                  isStockTracked && isOverStock
                                    ? "border-red-400 ring-2 ring-red-200 focus-visible:ring-red-400 text-red-700 dark:border-red-500 dark:ring-red-800 dark:text-red-400"
                                    : ""
                                }`}
                              />
                            )}
                          />
                          {isStockTracked && isOverStock && (
                            <p className="flex items-center gap-1 mt-1 text-[10px] text-red-500 font-medium leading-tight">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              Melebihi stok ({realStock})
                            </p>
                          )}
                        </TableCell>

                        {/* Current Stock */}
                        <TableCell className="text-center">
                          {isStockTracked ? (
                            currentItem?.size?.trim() ? (
                              isLoadingStock ? (
                                <span className="text-[10px] text-slate-400 italic">Loading...</span>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={`font-mono text-xs px-2 py-1 ${
                                    realStock > 0
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
                                      : "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700"
                                  }`}
                                >
                                  {realStock}
                                </Badge>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Pilih size</span>
                            )
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Remark */}
                        <TableCell>
                          <Input
                            placeholder="Catatan..."
                            {...register(`items.${index}.remark` as const)}
                            className="h-9 bg-white dark:bg-gray-800"
                          />
                        </TableCell>

                        {/* Remove Button */}
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (fields.length > 1) remove(index)
                            }}
                            disabled={fields.length <= 1}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Add another item button (bottom) */}
            <div className="p-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ toolName: "", type: "", size: "", satuan: "SET", qtyHandover: 0, remark: "" })}
                className="w-full border-dashed border-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 h-10"
              >
                <Plus className="w-4 h-4" />
                Tambah Item Lain
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── SUBMIT SECTION ── */}
        <div className="flex items-center justify-between pt-2 pb-6">
          <Link href="/handover">
            <Button variant="outline" type="button">Batal</Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 px-8 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Menyimpan...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Simpan Handover
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
