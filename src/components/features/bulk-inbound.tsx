"use client"

import { useState, useRef } from "react"
import Papa from "papaparse"
import { processBulkInboundAction } from "@/app/actions/inventory"
import { bulkInboundSchema } from "@/schemas/inventory"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react"

interface CsvRow {
  Model: string
  Article: string
  Color: string
  Size: string
  Stock: string
  PONumber?: string
  BottomTreatment?: string
  Notes?: string
}

const CSV_HEADERS = ["Model", "Article", "Color", "Size", "Stock", "PONumber", "BottomTreatment", "Notes"]

export function BulkInbound() {
  const [isOpen, setIsOpen] = useState(false)
  const [parsedData, setParsedData] = useState<CsvRow[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{
    message: string
    success: boolean
    details?: { successCount: number; errorCount: number; errors: string[] }
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = () => {
    const csvContent = CSV_HEADERS.join(",") + "\n" +
      "VL COURT 3.0 M,HP4549,ADPS AMBER GUM,5T,10,5703000135,None,Sample row\n" +
      "LITERACER ADAPT 8.0 INF,LB3072,A0QM CORE BLACK,3K,5,5703000136,Spray,\n"

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "bulk_inbound_template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setResult(null)
    setValidationErrors([])
    setIsValid(false)

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = []

        // Check for PapaParse-level errors
        if (results.errors.length > 0) {
          results.errors.forEach(err => {
            errors.push(`Row ${(err.row || 0) + 2}: CSV parse error — ${err.message}`)
          })
        }

        // Validate header presence
        const fileHeaders = results.meta.fields || []
        const requiredHeaders = ["Model", "Article", "Color", "Size", "Stock"]
        const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h))
        if (missingHeaders.length > 0) {
          errors.push(`❌ Upload Rejected: Missing required columns: ${missingHeaders.join(", ")}`)
          setValidationErrors(errors)
          setParsedData([])
          setFileName(file.name)
          return
        }

        if (results.data.length === 0) {
          errors.push("❌ Upload Rejected: CSV file contains no data rows.")
          setValidationErrors(errors)
          setParsedData([])
          setFileName(file.name)
          return
        }

        if (results.data.length > 500) {
          errors.push(`❌ Upload Rejected: Maximum 500 rows per import. Your file has ${results.data.length} rows.`)
          setValidationErrors(errors)
          setParsedData([])
          setFileName(file.name)
          return
        }

        // STRICT Zod validation — ALL rows must pass or entire file is rejected
        const validation = bulkInboundSchema.safeParse(results.data)

        if (!validation.success) {
          validation.error.issues.forEach(issue => {
            const path = issue.path
            // path[0] = array index, path[1] = field name
            const rowIndex = typeof path[0] === "number" ? path[0] : null
            const field = path[1] || "unknown"
            const rowLabel = rowIndex !== null ? `Row ${rowIndex + 2}` : "Unknown row"
            errors.push(`❌ ${rowLabel}: '${String(field)}' — ${issue.message}`)
          })

          setValidationErrors(errors)
          setParsedData(results.data as CsvRow[])
          setIsValid(false)
          setFileName(file.name)
          return
        }

        // All rows passed strict validation
        setValidationErrors([])
        setParsedData(results.data as CsvRow[])
        setIsValid(true)
        setFileName(file.name)
      },
      error: (err) => {
        setValidationErrors([`Failed to parse CSV: ${err.message}`])
        setParsedData([])
        setIsValid(false)
      }
    })
  }

  const handleImport = async () => {
    if (parsedData.length === 0 || !isValid) return

    setIsImporting(true)
    setResult(null)

    try {
      const res = await processBulkInboundAction(parsedData)
      setResult({
        message: res.message,
        success: res.success,
        details: res.details as { successCount: number; errorCount: number; errors: string[] } | undefined,
      })

      if (res.success) {
        setParsedData([])
        setFileName(null)
        setIsValid(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    } catch {
      setResult({ message: "An unexpected error occurred during import.", success: false })
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
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) handleClear()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      } />
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Inbound via CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Download Template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Step 1: Download Template</CardTitle>
              <CardDescription className="text-xs">
                Download the CSV template, fill it with your data, then upload it below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Download Template (.csv)
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Upload CSV */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Step 2: Upload CSV File</CardTitle>
              <CardDescription className="text-xs">
                Required columns: Model, Article, Color, Size, Stock. Optional: PONumber, BottomTreatment, Notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />

              {/* Strict Validation Errors — File Rejected */}
              {validationErrors.length > 0 && (
                <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-sm text-red-800 mb-2">
                    <ShieldAlert className="h-5 w-5" />
                    Upload Rejected — Fix all errors below and re-upload.
                  </div>
                  <div className="max-h-[150px] overflow-y-auto space-y-1">
                    {validationErrors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid file */}
              {fileName && isValid && parsedData.length > 0 && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>{fileName}</strong> — All <strong>{parsedData.length}</strong> rows passed strict validation. Ready to import.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Preview (only when valid) */}
          {isValid && parsedData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Step 3: Preview Data ({parsedData.length} rows)</CardTitle>
                <CardDescription className="text-xs">
                  Showing first {Math.min(parsedData.length, 10)} rows. Verify before importing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto max-h-[250px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0">
                      <TableRow>
                        <TableHead className="text-xs w-10">#</TableHead>
                        <TableHead className="text-xs">Model</TableHead>
                        <TableHead className="text-xs">Article</TableHead>
                        <TableHead className="text-xs">Color</TableHead>
                        <TableHead className="text-xs">Size</TableHead>
                        <TableHead className="text-xs text-right">Stock</TableHead>
                        <TableHead className="text-xs">PO</TableHead>
                        <TableHead className="text-xs">Bottom</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{row.Model}</TableCell>
                          <TableCell className="text-xs">{row.Article}</TableCell>
                          <TableCell className="text-xs">{row.Color}</TableCell>
                          <TableCell className="text-xs">{row.Size}</TableCell>
                          <TableCell className="text-xs text-right font-medium">{row.Stock}</TableCell>
                          <TableCell className="text-xs">{row.PONumber || "-"}</TableCell>
                          <TableCell className="text-xs">{row.BottomTreatment || "None"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedData.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    ... and {parsedData.length - 10} more rows
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-md text-sm ${
              result.success
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              <div className="flex items-center gap-2 font-medium mb-1">
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {result.message}
              </div>
              {result.details && result.details.errors.length > 0 && (
                <div className="mt-2 space-y-1 text-xs">
                  {result.details.errors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClear} disabled={isImporting}>
              Clear
            </Button>
            <Button
              onClick={handleImport}
              disabled={!isValid || parsedData.length === 0 || isImporting}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isImporting ? `Importing... (${parsedData.length} rows)` : `Import ${parsedData.length} Rows`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
