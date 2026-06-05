"use client"

import { useState } from "react"
import { importBpmTfmCSVAction } from "@/app/actions/bpm-tfm"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, Download, Loader2, FileUp, AlertCircle, X } from "lucide-react"

interface BpmTfmCsvImporterProps {
  onSuccess?: () => void
}

export function BpmTfmCsvImporter({ onSuccess }: BpmTfmCsvImporterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const router = useRouter()

  const handleDownloadTemplate = () => {
    const csvContent = `Code Last,Size Group,Qty BPM HOT,Qty BPM CHILLER,Qty TFM,Qty UNIV PAD
23021,10K - 2T,3,0,0,10
23021,3 - 6T,7,5,2,0
`
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "Template_BPM_TFM_Stock.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    setErrorMsg("")
    setValidationErrors([])
    if (!file) {
      setErrorMsg("Please select a CSV file first.")
      return
    }

    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        const errors: string[] = []

        const requiredHeaders = ["Code Last", "Size Group", "Qty BPM HOT", "Qty BPM CHILLER", "Qty TFM", "Qty UNIV PAD"]
        const headers = results.meta.fields || []
        for (const h of requiredHeaders) {
          if (!headers.includes(h)) {
            errors.push(`Missing required column: "${h}". Please check your CSV header row.`)
          }
        }

        if (errors.length === 0) {
          rows.forEach((row, index) => {
            const codeLast = row["Code Last"]?.trim()
            const sizeGroup = row["Size Group"]?.trim()
            const qtyHot = row["Qty BPM HOT"]?.trim()
            const qtyChiller = row["Qty BPM CHILLER"]?.trim()
            const qtyTfm = row["Qty TFM"]?.trim()
            const qtyUniv = row["Qty UNIV PAD"]?.trim()

            if (!codeLast) {
              errors.push(`Row ${index + 1}: "Code Last" is empty.`)
            }
            if (!sizeGroup) {
              errors.push(`Row ${index + 1}: "Size Group" is empty.`)
            }

            const checkNum = (val: string | undefined, colName: string) => {
              if (val && isNaN(parseInt(val, 10))) {
                errors.push(`Row ${index + 1}: "${colName}" value "${val}" is not a valid number.`)
              }
            }

            checkNum(qtyHot, "Qty BPM HOT")
            checkNum(qtyChiller, "Qty BPM CHILLER")
            checkNum(qtyTfm, "Qty TFM")
            checkNum(qtyUniv, "Qty UNIV PAD")
          })
        }

        if (errors.length > 0) {
          setValidationErrors(errors)
          setIsUploading(false)
          return
        }

        try {
          const res = await importBpmTfmCSVAction(rows)
          if (res.success) {
            setIsOpen(false)
            setFile(null)
            if (onSuccess) onSuccess()
            router.refresh()
          } else {
            setErrorMsg("Import Failed: " + res.message)
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            setErrorMsg("Error: " + (error.message || "An unexpected error occurred."))
          } else {
            setErrorMsg("Error: An unexpected error occurred.")
          }
        } finally {
          setIsUploading(false)
        }
      },
      error: (error) => {
        setErrorMsg("CSV Parsing Error: " + error.message)
        setIsUploading(false)
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-200">
          <Upload className="w-4 h-4" />
          Bulk Import (CSV)
        </Button>
      } />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" />
            Bulk Import BPM & TFM Stock
          </DialogTitle>
          <DialogDescription>
            Import stock data for BPM, TFM, and Universal Pad via a CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
            <h4 className="font-medium text-sm text-slate-900">Step 1: Download Template</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Download the CSV template, fill it with your stock data, then upload it below. Do not modify the header columns.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5">
              <Download className="w-4 h-4" />
              Download Template (.csv)
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
            <h4 className="font-medium text-sm text-slate-900">Step 2: Upload CSV File</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Required columns: Code Last, Size Group, Qty BPM HOT, Qty BPM CHILLER, Qty TFM, Qty UNIV PAD.
            </p>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setErrorMsg("")
                setValidationErrors([])
                handleFileChange(e)
              }}
              className="text-sm cursor-pointer bg-white"
            />
            {validationErrors.length > 0 && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="flex justify-between items-center">
                  <span>Validation Errors Found</span>
                  <Button variant="ghost" size="sm" onClick={() => setValidationErrors([])} className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-100">
                    <X className="w-3 h-3 mr-1" /> Clear
                  </Button>
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 text-xs space-y-1 max-h-40 overflow-y-auto">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {errorMsg && (
              <p className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded-md border border-red-100">{errorMsg}</p>
            )}
            <Button
              onClick={handleImport}
              disabled={!file || isUploading}
              className="w-full gap-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? "Importing..." : "Import Rows"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
