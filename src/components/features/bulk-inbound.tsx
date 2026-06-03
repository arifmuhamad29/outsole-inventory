"use client"

import { useState, useRef } from "react"
import Papa from "papaparse"
import { processBulkInboundAction } from "@/app/actions/inventory"
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
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

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
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{
    message: string
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
    setParseErrors([])

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validationErrors: string[] = []

        // Validate headers
        const fileHeaders = results.meta.fields || []
        const missingHeaders = CSV_HEADERS.filter(
          h => !["PONumber", "BottomTreatment", "Notes"].includes(h) && !fileHeaders.includes(h)
        )
        if (missingHeaders.length > 0) {
          validationErrors.push(`Missing required columns: ${missingHeaders.join(", ")}`)
        }

        if (results.errors.length > 0) {
          results.errors.forEach(err => {
            validationErrors.push(`Row ${(err.row || 0) + 2}: ${err.message}`)
          })
        }

        setParseErrors(validationErrors)
        setParsedData(results.data as CsvRow[])
        setFileName(file.name)
      },
      error: (err) => {
        setParseErrors([`Failed to parse CSV: ${err.message}`])
        setParsedData([])
      }
    })
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return

    setIsImporting(true)
    setResult(null)

    try {
      const res = await processBulkInboundAction(parsedData)
      setResult({
        message: res.message,
        details: res.details as { successCount: number; errorCount: number; errors: string[] } | undefined,
      })

      if (res.success && res.details && res.details.errorCount === 0) {
        setParsedData([])
        setFileName(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    } catch {
      setResult({ message: "An unexpected error occurred during import." })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClear = () => {
    setParsedData([])
    setParseErrors([])
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

              {parseErrors.length > 0 && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-xs space-y-1">
                  <div className="flex items-center gap-1 font-medium">
                    <XCircle className="h-4 w-4" /> Parse Errors:
                  </div>
                  {parseErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}

              {fileName && parsedData.length > 0 && (
                <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    <strong>{fileName}</strong> — Ready to import <strong>{parsedData.length}</strong> rows.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Preview */}
          {parsedData.length > 0 && (
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
              result.details?.errorCount === 0
                ? "bg-green-50 text-green-700"
                : result.details && result.details.successCount > 0
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-red-50 text-red-700"
            }`}>
              <div className="flex items-center gap-2 font-medium mb-1">
                {result.details?.errorCount === 0 ? (
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
              disabled={parsedData.length === 0 || isImporting || parseErrors.some(e => e.includes("Missing required columns"))}
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
