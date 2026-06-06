"use client"

import { useState } from "react"
import { importSingleModelAction } from "@/app/actions/tooling"
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

interface CsvImporterProps {
  onSuccess?: () => void
}

export function CsvImporter({ onSuccess }: CsvImporterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentModel: "" })
  const router = useRouter()

  const handleDownloadTemplate = () => {
    const csvContent = `Model Name,Category,Tooling Name,Phase,Qty,Order Date,Target ETA,Actual ETA,Status,Remark
LITE RACER NEXT,BOTTOM TOOLING,Tooling mold midsole,FSR,8 SET,2026-05-12,2026-06-12,,ON PROCESS,ON PROCESS SHIPMENT
LITE RACER NEXT,ASSEMBLY TOOLING,3D Gauge,FSR,1 SET,2026-05-12,2026-06-12,,ON PROCESS,
LITE RACER NEXT,BOTTOM TOOLING,ScribeLine,EXTREME,1 SET,2026-05-01,2026-05-10,2026-05-09,VERIFIED,
`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "Template_Tooling_MES.csv")
    link.style.visibility = 'hidden'
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
    setImportProgress({ current: 0, total: 0, currentModel: "" })

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        const errors: string[] = []
        
        const allowedCategories = ['BOTTOM TOOLING', 'ASSEMBLY TOOLING']
        const allowedPhases = ['EXTREME', 'FSR']
        const allowedStatuses = ['VERIFIED', 'EXISTING', 'ON PROCESS', 'NOT USE', '']

        rows.forEach((row, index) => {
          if (!row["Model Name"]?.trim()) return // Skip empty model names or invalid rows
          
          const category = row["Category"]?.trim().toUpperCase()
          const phase = row["Phase"]?.trim().toUpperCase()
          const status = row["Status"]?.trim().toUpperCase() || ""

          if (category && !allowedCategories.includes(category)) {
            errors.push(`Row ${index + 1}: Invalid Category '${row["Category"]}'. Must be BOTTOM TOOLING or ASSEMBLY TOOLING.`)
          }
          if (phase && !allowedPhases.includes(phase)) {
            errors.push(`Row ${index + 1}: Invalid Phase '${row["Phase"]}'. Must be EXTREME or FSR.`)
          }
          if (status && !allowedStatuses.includes(status)) {
            errors.push(`Row ${index + 1}: Invalid Status '${row["Status"]}'. Must be VERIFIED, EXISTING, ON PROCESS, or NOT USE.`)
          }
        })

        if (errors.length > 0) {
          setValidationErrors(errors)
          setIsUploading(false)
          return
        }

        try {
          // Client-Side Chunking by Model Name
          const groupedData = rows.reduce((acc, row) => {
            const modelName = row["Model Name"]?.trim()?.toUpperCase()
            if (!modelName) return acc

            if (!acc[modelName]) {
              acc[modelName] = []
            }
            acc[modelName].push(row)
            return acc
          }, {} as Record<string, Record<string, string>[]>)

          const models = Object.keys(groupedData)
          setImportProgress({ current: 0, total: models.length, currentModel: "" })

          let hasErrors = false
          let currentIndex = 0
          
          // Sequential Upload Loop
          for (const modelName of Object.keys(groupedData)) {
            const modelRows = groupedData[modelName]
            currentIndex++
            
            setImportProgress({ current: currentIndex, total: models.length, currentModel: modelName })

            try {
              const res = await importSingleModelAction(modelName, modelRows)
              if (!res.success) {
                hasErrors = true
                setErrorMsg(prev => prev ? `${prev}\nFailed ${modelName}: ${res.message}` : `Failed ${modelName}: ${res.message}`)
              }
            } catch (err: unknown) {
              hasErrors = true
              setErrorMsg(prev => prev ? `${prev}\nFailed ${modelName}: ${err instanceof Error ? err.message : String(err)}` : `Failed ${modelName}: ${err instanceof Error ? err.message : String(err)}`)
            }
          }

          if (!hasErrors) {
            setIsOpen(false)
            setFile(null)
            if (onSuccess) onSuccess()
            router.refresh()
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            setErrorMsg("Error: " + (error.message || "An unexpected error occurred."))
          } else {
            setErrorMsg("Error: An unexpected error occurred.")
          }
        } finally {
          setIsUploading(false)
          setImportProgress({ current: 0, total: 0, currentModel: "" })
        }
      },
      error: (error) => {
        setErrorMsg("CSV Parsing Error: " + error.message)
        setIsUploading(false)
      }
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
            Bulk Import Tooling Tracking
          </DialogTitle>
          <DialogDescription>
            Import multiple models and tooling checklists at once via a CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
            <h4 className="font-medium text-sm text-slate-900">Step 1: Download Template</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Download the CSV template, fill it with your tooling data, then upload it below. Do not modify the header columns.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5">
              <Download className="w-4 h-4" />
              Download Template (.csv)
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
            <h4 className="font-medium text-sm text-slate-900">Step 2: Upload CSV File</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Required columns: Model Name, Category, Tooling Name, Phase, Qty, Order Date, Target ETA, Actual ETA, Status, Remark.
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
              disabled={isUploading}
            />
            {validationErrors.length > 0 && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="flex justify-between items-center">
                  <span>Validation Errors Found</span>
                  <Button variant="ghost" size="sm" onClick={() => setValidationErrors([])} className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-100" disabled={isUploading}>
                    <X className="w-3 h-3 mr-1" /> Clear
                  </Button>
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 text-xs space-y-1">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {errorMsg && (
              <div className="max-h-32 overflow-y-auto">
                <p className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded-md border border-red-100 whitespace-pre-wrap">{errorMsg}</p>
              </div>
            )}
            
            {/* Progress UI */}
            {isUploading && importProgress.total > 0 && (
              <div className="space-y-2 py-2">
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Mengimpor Model {importProgress.current} dari {importProgress.total}...</span>
                  <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  Memproses: {importProgress.currentModel}
                </p>
              </div>
            )}

            <Button 
              onClick={handleImport} 
              disabled={!file || isUploading} 
              className="w-full gap-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? "Mengimpor Data..." : "Import Rows"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
