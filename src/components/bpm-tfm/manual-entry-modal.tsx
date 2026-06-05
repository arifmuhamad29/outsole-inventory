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
import { Plus, Loader2, Package, Trash2 } from "lucide-react"

interface SizeEntry {
  size: string
  stock: number
}

interface ToolGroup {
  toolName: string
  type: string
  sizes: SizeEntry[]
  sizeDisabled: boolean
}

const createInitialTools = (): ToolGroup[] => [
  { toolName: "BPM", type: "HOT", sizes: [{ size: "", stock: 0 }], sizeDisabled: false },
  { toolName: "BPM", type: "CHILLER", sizes: [{ size: "", stock: 0 }], sizeDisabled: false },
  { toolName: "TFM", type: "", sizes: [{ size: "", stock: 0 }], sizeDisabled: false },
  { toolName: "UNIVERSAL PAD", type: "", sizes: [{ size: "-", stock: 0 }], sizeDisabled: true },
]

interface ManualEntryModalProps {
  onSuccess?: () => void
}

export function ManualEntryModal({ onSuccess }: ManualEntryModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [codeLast, setCodeLast] = useState("")
  const [tools, setTools] = useState<ToolGroup[]>(createInitialTools())
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")

  const resetForm = () => {
    setCodeLast("")
    setTools(createInitialTools())
    setErrorMsg("")
  }

  const updateSizeEntry = (toolIdx: number, sizeIdx: number, field: "size" | "stock", value: string) => {
    setTools((prev) => {
      const updated = prev.map((tool, ti) => {
        if (ti !== toolIdx) return tool
        return {
          ...tool,
          sizes: tool.sizes.map((s, si) => {
            if (si !== sizeIdx) return s
            if (field === "size") return { ...s, size: value.toUpperCase() }
            return { ...s, stock: parseInt(value, 10) || 0 }
          }),
        }
      })
      return updated
    })
  }

  const addSizeRow = (toolIdx: number) => {
    setTools((prev) =>
      prev.map((tool, ti) => {
        if (ti !== toolIdx) return tool
        return { ...tool, sizes: [...tool.sizes, { size: "", stock: 0 }] }
      })
    )
  }

  const removeSizeRow = (toolIdx: number, sizeIdx: number) => {
    setTools((prev) =>
      prev.map((tool, ti) => {
        if (ti !== toolIdx) return tool
        if (tool.sizes.length <= 1) return tool // Keep at least 1
        return { ...tool, sizes: tool.sizes.filter((_, si) => si !== sizeIdx) }
      })
    )
  }

  const handleSave = () => {
    setErrorMsg("")

    if (!codeLast.trim()) {
      setErrorMsg("Code Last wajib diisi.")
      return
    }

    // Flatten nested state into payload
    const payload = tools.flatMap((tool) =>
      tool.sizes.map((s) => ({
        toolName: tool.toolName,
        type: tool.type,
        size: tool.sizeDisabled ? "-" : s.size,
        devStock: s.stock,
      }))
    ).filter((item) => item.devStock > 0 && item.size.trim() !== "")

    if (payload.length === 0) {
      setErrorMsg("Minimal satu baris harus memiliki Size dan Dev Stock > 0.")
      return
    }

    startTransition(async () => {
      const res = await addBpmTfmBatchAction(codeLast.trim(), payload)
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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Tambah Data BPM & TFM
          </DialogTitle>
          <DialogDescription>
            Masukkan Code Last lalu isi data tool. Klik + untuk menambah ukuran baru per tool.
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

          {/* Tool Variants */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">TOOL VARIANTS</label>

            {tools.map((tool, toolIdx) => (
              <div key={toolIdx} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Tool Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{tool.toolName}</span>
                    {tool.type && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                        {tool.type}
                      </span>
                    )}
                  </div>
                  {!tool.sizeDisabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addSizeRow(toolIdx)}
                      disabled={isPending}
                      className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Plus className="w-3 h-3" />
                      Add Size
                    </Button>
                  )}
                </div>

                {/* Size Rows */}
                <div className="divide-y divide-slate-100">
                  {tool.sizes.map((sizeEntry, sizeIdx) => (
                    <div
                      key={sizeIdx}
                      className={`flex items-center gap-2 px-3 py-2 ${sizeIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                    >
                      {/* Size Input */}
                      <div className="flex-1 min-w-0">
                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Size</label>
                        {tool.sizeDisabled ? (
                          <div className="h-8 flex items-center px-2 bg-slate-100 rounded-md text-sm text-slate-400 border border-slate-200">
                            —
                          </div>
                        ) : (
                          <Input
                            placeholder="e.g. 3K-5TK"
                            value={sizeEntry.size}
                            onChange={(e) => updateSizeEntry(toolIdx, sizeIdx, "size", e.target.value)}
                            disabled={isPending}
                            className="h-8 text-sm"
                          />
                        )}
                      </div>

                      {/* Stock Input */}
                      <div className="w-20">
                        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Stock</label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={sizeEntry.stock === 0 ? "" : sizeEntry.stock.toString()}
                          onChange={(e) => updateSizeEntry(toolIdx, sizeIdx, "stock", e.target.value)}
                          disabled={isPending}
                          className="h-8 text-sm text-center"
                        />
                      </div>

                      {/* Remove Button (only for dynamically added rows) */}
                      <div className="w-8 pt-3.5">
                        {!tool.sizeDisabled && tool.sizes.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSizeRow(toolIdx, sizeIdx)}
                            disabled={isPending}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <div className="h-8 w-8" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
