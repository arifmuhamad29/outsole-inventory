"use client"

import { useState, useTransition } from "react"
import { addBpmTfmBatchAction } from "@/app/actions/bpm-tfm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, Package } from "lucide-react"

interface ToolVariantRow {
  toolName: string
  type: string
  size: string
  devStock: number
  sizeDisabled: boolean
}

const DEFAULT_ROWS: ToolVariantRow[] = [
  { toolName: "BPM", type: "HOT", size: "", devStock: 0, sizeDisabled: false },
  { toolName: "BPM", type: "CHILLER", size: "", devStock: 0, sizeDisabled: false },
  { toolName: "TFM", type: "", size: "", devStock: 0, sizeDisabled: false },
  { toolName: "UNIVERSAL PAD", type: "", size: "-", devStock: 0, sizeDisabled: true },
]

interface ManualEntryModalProps {
  onSuccess?: () => void
}

export function ManualEntryModal({ onSuccess }: ManualEntryModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [codeLast, setCodeLast] = useState("")
  const [rows, setRows] = useState<ToolVariantRow[]>(
    DEFAULT_ROWS.map((r) => ({ ...r }))
  )
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")

  const resetForm = () => {
    setCodeLast("")
    setRows(DEFAULT_ROWS.map((r) => ({ ...r })))
    setErrorMsg("")
  }

  const updateRow = (index: number, field: "size" | "devStock", value: string) => {
    setRows((prev) => {
      const updated = [...prev]
      if (field === "size") {
        updated[index] = { ...updated[index], size: value.toUpperCase() }
      } else {
        updated[index] = { ...updated[index], devStock: parseInt(value, 10) || 0 }
      }
      return updated
    })
  }

  const handleSave = () => {
    setErrorMsg("")

    if (!codeLast.trim()) {
      setErrorMsg("Code Last wajib diisi.")
      return
    }

    const hasData = rows.some((r) => r.devStock > 0)
    if (!hasData) {
      setErrorMsg("Minimal satu baris harus memiliki Dev Stock > 0.")
      return
    }

    // Validate: non-disabled rows with stock > 0 must have size
    for (const row of rows) {
      if (row.devStock > 0 && !row.sizeDisabled && !row.size.trim()) {
        setErrorMsg(`Size wajib diisi untuk ${row.toolName}${row.type ? ` (${row.type})` : ""} karena Dev Stock > 0.`)
        return
      }
    }

    startTransition(async () => {
      const items = rows.map((r) => ({
        toolName: r.toolName,
        type: r.type,
        size: r.sizeDisabled ? "-" : r.size,
        devStock: r.devStock,
      }))

      const res = await addBpmTfmBatchAction(codeLast.trim(), items)
      if (res.success) {
        setIsOpen(false)
        resetForm()
        if (onSuccess) onSuccess()
      } else {
        setErrorMsg(res.message || "Gagal menyimpan data.")
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger render={
        <Button className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          New Entry
        </Button>
      } />
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Tambah Data BPM & TFM
          </DialogTitle>
          <DialogDescription>
            Masukkan Code Last lalu isi data tool yang tersedia. Baris dengan Dev Stock 0 akan dilewati.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Code Last Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">CODE LAST</label>
            <Input
              placeholder="Contoh: 43011"
              value={codeLast}
              onChange={(e) => setCodeLast(e.target.value)}
              disabled={isPending}
              className="h-10 font-mono text-base tracking-wider"
            />
          </div>

          {/* Tool Variants Grid */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">TOOL VARIANTS</label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Grid Header */}
              <div className="grid grid-cols-[1fr_80px_120px_80px] gap-0 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="px-3 py-2">Tool Name</div>
                <div className="px-3 py-2">Type</div>
                <div className="px-3 py-2">Size</div>
                <div className="px-3 py-2 text-center">Stock</div>
              </div>

              {/* Grid Rows */}
              {rows.map((row, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-[1fr_80px_120px_80px] gap-0 items-center border-b last:border-b-0 border-slate-100 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  }`}
                >
                  <div className="px-3 py-2 text-sm font-medium text-slate-800">
                    {row.toolName}
                  </div>
                  <div className="px-3 py-2 text-sm text-slate-500">
                    {row.type || "—"}
                  </div>
                  <div className="px-2 py-1.5">
                    {row.sizeDisabled ? (
                      <div className="h-8 flex items-center px-2 bg-slate-100 rounded-md text-sm text-slate-400 border border-slate-200">
                        —
                      </div>
                    ) : (
                      <Input
                        placeholder="e.g. 3K-5TK"
                        value={row.size}
                        onChange={(e) => updateRow(index, "size", e.target.value)}
                        disabled={isPending}
                        className="h-8 text-sm"
                      />
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={row.devStock === 0 ? "" : row.devStock.toString()}
                      onChange={(e) => updateRow(index, "devStock", e.target.value)}
                      disabled={isPending}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded-md border border-red-100">
              {errorMsg}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setIsOpen(false); resetForm() }} disabled={isPending}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isPending || !codeLast.trim()}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
