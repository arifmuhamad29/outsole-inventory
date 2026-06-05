"use client"

import { useState } from "react"
import { importBpmTfmFlatCSVAction } from "@/app/actions/bpm-tfm"
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
    const csvContent = `Code Last,Tool Name,Type,Size,Dev Stock
43011,BPM,HOT,3K - 5TK,2
43011,BPM,CHILLER,3K - 5TK,2
43011,TFM,,3K - 5TK,1
43011,UNIVERSAL PAD,,3K - 5TK,1
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

        const requiredHeaders = ["Code Last", "Tool Name", "Type", "Size", "Dev Stock"]
        const headers = results.meta.fields || []
        
        let hasHeaderError = false
        for (const h of requiredHeaders) {
          if (!headers.includes(h)) {
            hasHeaderError = true
            break
          }
        }

        if (hasHeaderError) {
          errors.push(`Format CSV tidak sesuai. Harap gunakan template yang dapat diunduh di Step 1.`)
        }

        if (errors.length === 0) {
          rows.forEach((row, index) => {
            const codeLast = row["Code Last"]?.trim()
            const toolName = row["Tool Name"]?.trim().toUpperCase()
            const size = row["Size"]?.trim()
            const devStock = row["Dev Stock"]?.trim()

            if (!codeLast) {
              errors.push(`Row ${index + 1}: "Code Last" is empty.`)
            }
            if (!toolName) {
              errors.push(`Row ${index + 1}: "Tool Name" is empty.`)
            }
            if (!size) {
              errors.push(`Row ${index + 1}: "Size" is empty.`)
            }
            if (devStock && isNaN(parseInt(devStock, 10))) {
              errors.push(`Row ${index + 1}: "Dev Stock" value "${devStock}" is not a valid number.`)
            }
          })
        }

        if (errors.length > 0) {
          setValidationErrors(errors)
          setIsUploading(false)
          return
        }

        try {
          const res = await importBpmTfmFlatCSVAction(rows)
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
              Required columns: Code Last, Tool Name, Type, Size, Dev Stock.
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
