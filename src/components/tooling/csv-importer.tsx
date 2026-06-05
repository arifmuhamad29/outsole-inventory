"use client"

import { useState } from "react"
import { importToolingCSVAction } from "@/app/actions/tooling"
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
import { Upload, Download, Loader2, FileUp } from "lucide-react"

export function CsvImporter() {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleDownloadTemplate = () => {
    const csvContent = `Model Name,Category,Tooling Name,Phase,Qty,Order Date,Target ETA,Actual ETA,Status,Remark
LITE RACER NEXT,BOTTOM TOOLING,Tooling mold midsole,FSR,8 SET,2026-05-12,2026-06-12,,ON PROCESS,ON PROCESS SHIPMENT
LITE RACER NEXT,ASSEMBLY TOOLING,3D Gauge,FSR,1 SET,2026-05-12,2026-06-12,,ON PROCESS,
LITE RACER NEXT,BOTTOM TOOLING,ScribeLine,SAMPLE,1 SET,2026-05-01,2026-05-10,2026-05-09,VERIFIED,
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
    if (!file) {
      alert("Please select a CSV file first.")
      return
    }

    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await importToolingCSVAction(results.data as Record<string, string>[])
          if (res.success) {
            alert("CSV data imported successfully.")
            setIsOpen(false)
            setFile(null)
          } else {
            alert("Import Failed: " + res.message)
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            alert("Error: " + (error.message || "An unexpected error occurred."))
          } else {
            alert("Error: An unexpected error occurred.")
          }
        } finally {
          setIsUploading(false)
        }
      },
      error: (error) => {
        alert("CSV Parsing Error: " + error.message)
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
              onChange={handleFileChange}
              className="text-sm cursor-pointer bg-white"
            />
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
