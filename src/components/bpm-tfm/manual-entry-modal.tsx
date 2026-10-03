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

interface SizeGroup {
  size: string
  bpmHot: number
  bpmChiller: number
  vampPress: number
  topGauge: number
  bottomGauge: number
  screbline: number
  gaugeSpring: number
  gaugeMarking3d: number
  socklinerPattern: number
  topLast: number
  padPress: number
}

const createInitialSizeGroup = (): SizeGroup => ({
  size: "",
  bpmHot: 0,
  bpmChiller: 0,
  vampPress: 0,
  topGauge: 0,
  bottomGauge: 0,
  screbline: 0,
  gaugeSpring: 0,
  gaugeMarking3d: 0,
  socklinerPattern: 0,
  topLast: 0,
  padPress: 0,
})

interface ManualEntryModalProps {
  onSuccess?: () => void
}

export function ManualEntryModal({ onSuccess }: ManualEntryModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [codeLast, setCodeLast] = useState("")
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([createInitialSizeGroup()])
  const [universalStock, setUniversalStock] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")

  const resetForm = () => {
    setCodeLast("")
    setSizeGroups([createInitialSizeGroup()])
    setUniversalStock(0)
    setErrorMsg("")
  }

  const updateSizeGroup = (index: number, field: keyof SizeGroup, value: string) => {
    setSizeGroups((prev) => {
      const updated = [...prev]
      if (field === "size") {
        updated[index] = { ...updated[index], size: value.toUpperCase() }
      } else {
        updated[index] = { ...updated[index], [field]: parseInt(value, 10) || 0 }
      }
      return updated
    })
  }

  const addSizeGroup = () => {
    setSizeGroups((prev) => [...prev, createInitialSizeGroup()])
  }

  const removeSizeGroup = (index: number) => {
    setSizeGroups((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSave = () => {
    setErrorMsg("")

    if (!codeLast.trim()) {
      setErrorMsg("Code Last wajib diisi.")
      return
    }

    const payload: { toolName: string; type: string; size: string; devStock: number }[] = []
    let hasValidationError = false

    // 1. Process Size Groups
    sizeGroups.forEach((group, index) => {
      const hasStock = 
        group.bpmHot > 0 || group.bpmChiller > 0 || group.vampPress > 0 ||
        group.topGauge > 0 || group.bottomGauge > 0 || group.screbline > 0 ||
        group.gaugeSpring > 0 || group.gaugeMarking3d > 0 || group.socklinerPattern > 0 ||
        group.topLast > 0 || group.padPress > 0

      if (hasStock && !group.size.trim()) {
        setErrorMsg(`Size wajib diisi pada grup ke-${index + 1} karena memiliki stok > 0.`)
        hasValidationError = true
        return
      }

      if (!group.size.trim()) return // Skip empty sizes without stock

      if (group.bpmHot > 0) payload.push({ toolName: "BPM", type: "HOT", size: group.size, devStock: group.bpmHot })
      if (group.bpmChiller > 0) payload.push({ toolName: "BPM", type: "CHILLER", size: group.size, devStock: group.bpmChiller })
      if (group.vampPress > 0) payload.push({ toolName: "VAMP PRESS", type: "", size: group.size, devStock: group.vampPress })
      if (group.topGauge > 0) payload.push({ toolName: "TOP GAUGE", type: "", size: group.size, devStock: group.topGauge })
      if (group.bottomGauge > 0) payload.push({ toolName: "BOTTOM GAUGE", type: "", size: group.size, devStock: group.bottomGauge })
      if (group.screbline > 0) payload.push({ toolName: "SCREBLINE", type: "", size: group.size, devStock: group.screbline })
      if (group.gaugeSpring > 0) payload.push({ toolName: "GAUGE SPRING", type: "", size: group.size, devStock: group.gaugeSpring })
      if (group.gaugeMarking3d > 0) payload.push({ toolName: "3D GAUGE MARKING (OTG)", type: "", size: group.size, devStock: group.gaugeMarking3d })
      if (group.socklinerPattern > 0) payload.push({ toolName: "SOCKLINER PATTERN", type: "", size: group.size, devStock: group.socklinerPattern })
      if (group.topLast > 0) payload.push({ toolName: "TOP LAST", type: "", size: group.size, devStock: group.topLast })
      if (group.padPress > 0) payload.push({ toolName: "PAD PRESS", type: "", size: group.size, devStock: group.padPress })
    })

    if (hasValidationError) return

    // 2. Process Universal Pad
    if (universalStock > 0) {
      payload.push({ toolName: "UNIVERSAL PAD", type: "", size: "-", devStock: universalStock })
    }

    if (payload.length === 0) {
      setErrorMsg("Minimal satu alat harus memiliki Size dan Stok > 0.")
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
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Tambah Data Inventory Tooling
          </DialogTitle>
          <DialogDescription>
            Tentukan ukuran (Size) lalu isi kuantitas stok untuk masing-masing tooling sekaligus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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

          {/* Size Groups */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">ALOKASI UKURAN & STOK</label>
            
            <div className="space-y-4">
              {sizeGroups.map((group, index) => (
                <div key={index} className="relative border border-slate-200 rounded-lg bg-slate-50/50 p-4 pt-5 shadow-sm">
                  {/* Remove Button */}
                  {sizeGroups.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSizeGroup(index)}
                      disabled={isPending}
                      className="absolute top-2 right-2 h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      title="Hapus baris ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}

                  <div className="grid gap-4">
                    {/* Master Size Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Master Size
                      </label>
                      <Input
                        placeholder="e.g. 3K-5TK"
                        value={group.size}
                        onChange={(e) => updateSizeGroup(index, "size", e.target.value)}
                        disabled={isPending}
                        className="h-9 font-medium bg-white"
                      />
                    </div>

                    {/* Stock Inputs Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider truncate">
                          BPM HOT
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.bpmHot === 0 ? "" : group.bpmHot.toString()}
                          onChange={(e) => updateSizeGroup(index, "bpmHot", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-amber-200 focus-visible:ring-amber-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider truncate">
                          BPM CHILLER
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.bpmChiller === 0 ? "" : group.bpmChiller.toString()}
                          onChange={(e) => updateSizeGroup(index, "bpmChiller", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-blue-200 focus-visible:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider truncate">
                          VAMP PRESS
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.vampPress === 0 ? "" : group.vampPress.toString()}
                          onChange={(e) => updateSizeGroup(index, "vampPress", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-emerald-200 focus-visible:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider truncate">
                          TOP GAUGE
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.topGauge === 0 ? "" : group.topGauge.toString()}
                          onChange={(e) => updateSizeGroup(index, "topGauge", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-indigo-200 focus-visible:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider truncate">
                          BOTTOM GAUGE
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.bottomGauge === 0 ? "" : group.bottomGauge.toString()}
                          onChange={(e) => updateSizeGroup(index, "bottomGauge", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-indigo-200 focus-visible:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate">
                          SCREBLINE
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.screbline === 0 ? "" : group.screbline.toString()}
                          onChange={(e) => updateSizeGroup(index, "screbline", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-slate-200 focus-visible:ring-slate-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-orange-600 uppercase tracking-wider truncate">
                          GAUGE SPRING
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.gaugeSpring === 0 ? "" : group.gaugeSpring.toString()}
                          onChange={(e) => updateSizeGroup(index, "gaugeSpring", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-orange-200 focus-visible:ring-orange-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-pink-600 uppercase tracking-wider truncate">
                          3D GAUGE MARKING
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.gaugeMarking3d === 0 ? "" : group.gaugeMarking3d.toString()}
                          onChange={(e) => updateSizeGroup(index, "gaugeMarking3d", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-pink-200 focus-visible:ring-pink-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider truncate">
                          SOCKLINER PATT.
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.socklinerPattern === 0 ? "" : group.socklinerPattern.toString()}
                          onChange={(e) => updateSizeGroup(index, "socklinerPattern", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-cyan-200 focus-visible:ring-cyan-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-rose-600 uppercase tracking-wider truncate">
                          TOP LAST
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.topLast === 0 ? "" : group.topLast.toString()}
                          onChange={(e) => updateSizeGroup(index, "topLast", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-rose-200 focus-visible:ring-rose-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-violet-600 uppercase tracking-wider truncate">
                          PAD PRESS
                        </label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={group.padPress === 0 ? "" : group.padPress.toString()}
                          onChange={(e) => updateSizeGroup(index, "padPress", e.target.value)}
                          disabled={isPending}
                          className="h-9 text-center font-semibold bg-white border-violet-200 focus-visible:ring-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSizeGroup}
              disabled={isPending}
              className="w-full mt-2 border-dashed border-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 gap-2 h-10"
            >
              <Plus className="w-4 h-4" />
              Tambah Ukuran Baru
            </Button>
          </div>

          {/* Universal Pad */}
          <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-800 text-sm">UNIVERSAL PAD</h4>
              <p className="text-xs text-slate-500 mt-0.5">Size bersifat universal (-)</p>
            </div>
            <div className="w-24">
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={universalStock === 0 ? "" : universalStock.toString()}
                onChange={(e) => setUniversalStock(parseInt(e.target.value, 10) || 0)}
                disabled={isPending}
                className="h-9 text-center font-semibold bg-white"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-sm text-red-500 font-medium bg-red-50 p-3 rounded-md border border-red-100">
              {errorMsg}
            </p>
          )}
        </div>

        <DialogFooter className="pt-2">
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
