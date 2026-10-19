"use client"

import { useState, useRef } from "react"
import Papa from "papaparse"
import { processBulkTrackingAction } from "@/app/actions/tracking"
import { bulkTrackingSchema, normalizeGender } from "@/schemas/tracking"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Upload, Download, FileSpreadsheet, CheckCircle2, ShieldAlert, Loader2, Layers } from "lucide-react"

interface CsvTrackingRow {
  Season?: string
  Article: string
  Model: string
  Gender: string
  Size: string
  Quantity: string | number
  PONumber?: string
  Supplier?: string
  MidsoleColor?: string
  MidsoleMaterial?: string
  OutsoleColor?: string
  OutsoleMaterial?: string
  WedgeColor?: string
  WedgeMaterial?: string
  CRColor?: string
  CRMaterial?: string
  BottomTreatment?: string
  OrderStatus?: string
  Notes?: string
}

const CSV_HEADERS = [
  "Season",
  "Article",
  "Model",
  "Gender",
  "Size",
  "Quantity",
  "PONumber",
  "Supplier",
  "MidsoleColor",
  "MidsoleMaterial",
  "OutsoleColor",
  "OutsoleMaterial",
  "WedgeColor",
  "WedgeMaterial",
  "CRColor",
  "CRMaterial",
  "BottomTreatment",
  "OrderStatus",
  "Notes",
]

interface BulkTrackingProps {
  onImportSuccess?: () => void
  activeSeasonId?: string | null
}

export function BulkTracking({ onImportSuccess, activeSeasonId }: BulkTrackingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [parsedData, setParsedData] = useState<CsvTrackingRow[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [batchCount, setBatchCount] = useState<number>(0)
  const [result, setResult] = useState<{
    message: string
    success: boolean
    details?: { successCount: number; errorCount: number; errors: string[]; batchesCount?: number }
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = () => {
    const csvContent =
      CSV_HEADERS.join(",") +
      "\n" +
      "SS27,HQ0170,574,Men,7,12,5703000135,PT Outsole Prima,SEA SALT,DMEVA,BLACK,RUBBER,SEA GLASES,EVA,SEA GLASES,TPU,None,ORDERED,Sample 1\n" +
      "SS27,HQ0170,574,Men,7T,24,5703000135,PT Outsole Prima,SEA SALT,DMEVA,BLACK,RUBBER,SEA GLASES,EVA,SEA GLASES,TPU,None,ORDERED,Sample 1\n" +
      "SS27,HQ0170,574,Men,8,30,5703000135,PT Outsole Prima,SEA SALT,DMEVA,BLACK,RUBBER,SEA GLASES,EVA,SEA GLASES,TPU,None,ORDERED,Sample 1\n" +
      "SS27,P57472N,574,Kids/Jr,10K,15,5703000136,PT Sumber Karet,WHITE,EVA,GUM,RUBBER,-,-,-,-,Spray,NOT_ORDERED,Sample 2\n" +
      "SS27,P57472N,574,Kids/Jr,11K,20,5703000136,PT Sumber Karet,WHITE,EVA,GUM,RUBBER,-,-,-,-,Spray,NOT_ORDERED,Sample 2\n"

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "bulk_purchase_tracking_template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  // Transform messy header names into canonical keys
  const transformHeader = (header: string) => {
    const h = header.trim()
    const lower = h.toLowerCase().replace(/[\s_\-.]/g, "")
    if (lower === "season") return "Season"
    if (lower === "article" || lower === "art") return "Article"
    if (lower === "model" || lower === "modelname") return "Model"
    if (lower === "gender" || lower === "gendercategory" || lower === "category") return "Gender"
    if (lower === "size") return "Size"
    if (lower === "quantity" || lower === "qty" || lower === "stock" || lower === "jumlah") return "Quantity"
    if (lower === "ponumber" || lower === "po" || lower === "nopo") return "PONumber"
    if (lower === "supplier" || lower === "vendor") return "Supplier"
    if (lower === "midsolecolor" || lower === "midcolor") return "MidsoleColor"
    if (lower === "midsolematerial" || lower === "midmaterial") return "MidsoleMaterial"
    if (lower === "outsolecolor" || lower === "outcolor") return "OutsoleColor"
    if (lower === "outsolematerial" || lower === "outmaterial") return "OutsoleMaterial"
    if (lower === "wedgecolor" || lower === "wdgcolor") return "WedgeColor"
    if (lower === "wedgematerial" || lower === "wdgmaterial") return "WedgeMaterial"
    if (lower === "crcolor" || lower === "crdevicecolor") return "CRColor"
    if (lower === "crmaterial" || lower === "crdevicematerial") return "CRMaterial"
    if (lower === "bottomtreatment" || lower === "treatment") return "BottomTreatment"
    if (lower === "orderstatus" || lower === "status") return "OrderStatus"
    if (lower === "notes" || lower === "note" || lower === "keterangan") return "Notes"
    return h
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setResult(null)
    setValidationErrors([])
    setIsValid(false)
    setBatchCount(0)

    Papa.parse<CsvTrackingRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader,
      complete: (results) => {
        const errors: string[] = []

        if (results.errors.length > 0) {
          results.errors.forEach((err) => {
            errors.push(`Row ${(err.row || 0) + 2}: CSV parse error — ${err.message}`)
          })
        }

        const fileHeaders = results.meta.fields || []
        const requiredHeaders = ["Article", "Model", "Gender", "Size", "Quantity"]
        const missingHeaders = requiredHeaders.filter((h) => !fileHeaders.includes(h))
        if (missingHeaders.length > 0) {
          errors.push(`Upload Ditolak: Kolom wajib belum ada: ${missingHeaders.join(", ")}`)
          setValidationErrors(errors)
          setParsedData([])
          setFileName(file.name)
          return
        }

        if (results.data.length === 0) {
          errors.push("Upload Ditolak: File CSV kosong.")
          setValidationErrors(errors)
          setParsedData([])
          setFileName(file.name)
          return
        }

        if (results.data.length > 500) {
          errors.push(`Upload Ditolak: Maksimal 500 baris per import. File Anda memiliki ${results.data.length} baris.`)
          setValidationErrors(errors)
          setParsedData([])
          setFileName(file.name)
          return
        }

        // Zod validation
        const validation = bulkTrackingSchema.safeParse(results.data)

        if (!validation.success) {
          validation.error.issues.forEach((issue) => {
            const path = issue.path
            const rowIndex = typeof path[0] === "number" ? path[0] : null
            const field = path[1] || "unknown"
            const rowLabel = rowIndex !== null ? `Baris ${rowIndex + 2}` : "Baris tidak diketahui"
            errors.push(`${rowLabel}: '${String(field)}' — ${issue.message}`)
          })

          setValidationErrors(errors)
          setParsedData(results.data as CsvTrackingRow[])
          setIsValid(false)
          setFileName(file.name)
          return
        }

        // Semantic check for gender
        const semanticErrors: string[] = []
        validation.data.forEach((row, i) => {
          const gender = normalizeGender(row.Gender)
          if (!gender) {
            semanticErrors.push(`Baris ${i + 2}: Gender '${row.Gender}' tidak valid. Pilihan: Men, Women, Unisex, Infant, Kids/Jr`)
          }
        })

        if (semanticErrors.length > 0) {
          setValidationErrors(semanticErrors)
          setParsedData(results.data as CsvTrackingRow[])
          setIsValid(false)
          setFileName(file.name)
          return
        }

        // Calculate distinct batches
        const batchKeys = new Set(
          validation.data.map(
            (r) =>
              `${(r.Season || "").toUpperCase()}:::${r.Article.toUpperCase()}:::${r.Model.toUpperCase()}:::${normalizeGender(r.Gender)}:::${(r.PONumber || "-").toUpperCase()}`
          )
        )
        setBatchCount(batchKeys.size)

        setValidationErrors([])
        setParsedData(validation.data as CsvTrackingRow[])
        setIsValid(true)
        setFileName(file.name)
      },
      error: (err) => {
        setValidationErrors([`Gagal membaca file CSV: ${err.message}`])
        setParsedData([])
        setIsValid(false)
      },
    })
  }

  const handleImport = async () => {
    if (parsedData.length === 0 || !isValid) return

    setIsImporting(true)
    setResult(null)

    try {
      const res = await processBulkTrackingAction(parsedData, activeSeasonId)
      setResult({
        message: res.message,
        success: res.success,
        details: res.details,
      })

      if (res.success) {
        setParsedData([])
        setFileName(null)
        setIsValid(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
        onImportSuccess?.()
      }
    } catch {
      setResult({ message: "Terjadi kesalahan sistem saat proses import.", success: false })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClear = () => {
    setParsedData([])
    setValidationErrors([])
    setIsValid(false)
    setFileName(null)
    setResult(null)
    setBatchCount(0)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) handleClear()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800 transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4 text-violet-600" />
            Import CSV
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[850px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-950 font-bold">
            <FileSpreadsheet className="h-5 w-5 text-violet-600" />
            Bulk Import Purchase Tracking via CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Download Template */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Langkah 1: Unduh Format Template CSV</CardTitle>
              <CardDescription className="text-xs">
                Unduh file template CSV, isi data purchase order & ukuran sepatu Anda, lalu unggah kembali di Langkah 2.
                Baris dengan Artikel, Model, Gender, dan PO yang sama akan otomatis digabung ke dalam 1 Order Matrix.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                <Download className="h-4 w-4 text-violet-600" />
                Unduh Template (.csv)
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Upload CSV */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Langkah 2: Unggah File CSV</CardTitle>
              <CardDescription className="text-xs">
                Kolom wajib: <strong>Article, Model, Gender, Size, Quantity</strong>. Kolom opsional: Season, PONumber, Supplier, MidsoleColor, OutsoleColor, dll.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer file:text-violet-700 file:font-medium"
              />

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-sm text-red-800 mb-2">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    Upload Ditolak — Perbaiki kesalahan berikut sebelum melanjutkan:
                  </div>
                  <div className="max-h-[160px] overflow-y-auto space-y-1">
                    {validationErrors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid file info */}
              {fileName && isValid && parsedData.length > 0 && (
                <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-900">
                      {fileName} — Valid & Siap Diimpor!
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Total <strong>{parsedData.length} baris ukuran</strong> terdeteksi, dikelompokkan menjadi{" "}
                      <strong>{batchCount} Purchase Order Matrix</strong>.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Preview Data */}
          {isValid && parsedData.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4 text-violet-600" />
                    Langkah 3: Preview Data ({parsedData.length} baris)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Menampilkan 10 baris pertama. Pastikan artikel, gender, dan kuantitas ukuran sudah tepat.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-xs font-semibold">
                    {batchCount} PO Matrix
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs">
                    {parsedData.length} Ukuran
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto max-h-[260px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-xs w-10">#</TableHead>
                        <TableHead className="text-xs">Season</TableHead>
                        <TableHead className="text-xs">Article</TableHead>
                        <TableHead className="text-xs">Model</TableHead>
                        <TableHead className="text-xs">Gender</TableHead>
                        <TableHead className="text-xs">Size</TableHead>
                        <TableHead className="text-xs text-right">Qty</TableHead>
                        <TableHead className="text-xs">PO Number</TableHead>
                        <TableHead className="text-xs">Midsole</TableHead>
                        <TableHead className="text-xs">Outsole</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-mono">{row.Season || "(Default)"}</TableCell>
                          <TableCell className="text-xs font-semibold">{row.Article}</TableCell>
                          <TableCell className="text-xs">{row.Model}</TableCell>
                          <TableCell className="text-xs">
                            <span className="px-1.5 py-0.5 rounded text-[11px] bg-slate-100 font-medium">
                              {row.Gender}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-violet-700">{row.Size}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{row.Quantity}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{row.PONumber || "-"}</TableCell>
                          <TableCell className="text-xs truncate max-w-[100px]" title={row.MidsoleColor || "-"}>
                            {row.MidsoleColor || "-"}
                          </TableCell>
                          <TableCell className="text-xs truncate max-w-[100px]" title={row.OutsoleColor || "-"}>
                            {row.OutsoleColor || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted">
                              {row.OrderStatus || "NOT_ORDERED"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedData.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center mt-2 italic">
                    ... dan {parsedData.length - 10} baris ukuran lainnya.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Result Alert */}
          {result && (
            <div
              className={`p-4 rounded-md border text-sm flex items-start gap-3 ${
                result.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{result.message}</p>
                {result.details && result.details.errors.length > 0 && (
                  <div className="mt-2 text-xs space-y-1 max-h-[120px] overflow-y-auto">
                    {result.details.errors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isImporting || (parsedData.length === 0 && !result)}
            >
              Reset / Bersihkan
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isImporting}
              >
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={!isValid || parsedData.length === 0 || isImporting}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white gap-2 shadow-md"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengimpor...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Proses Import ({parsedData.length} Baris)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
