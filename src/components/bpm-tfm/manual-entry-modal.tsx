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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SizeGroup {
  size: string
  hotStock: number
  chillerStock: number
  vampPressStock: number
}

const createInitialSizeGroup = (): SizeGroup => ({
  size: "",
  hotStock: 0,
  chillerStock: 0,
  vampPressStock: 0,
})

interface OtherSizeGroup {
  size: string
  qty: number
  satuan: string
  remark: string
}

const createInitialOtherSizeGroup = (): OtherSizeGroup => ({
  size: "",
  qty: 0,
  satuan: "SET",
  remark: "",
})

const TOOL_OPTIONS = [
  "BPM & VAMP PRESS",
  "TOP GAUGE",
  "BOTTOM GAUGE",
  "SCREBLINE",
  "GAUGE SPRING",
  "3D GAUGE MARKING (OTG)",
  "SOCKLINER PATTERN",
  "UNIVERSAL PAD",
  "TOP LAST",
  "PAD PRESS",
]

export function ManualEntryModal({ onSuccess }: { onSuccess?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTool, setSelectedTool] = useState(TOOL_OPTIONS[0])
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")

  // BPM & Vamp Press state
  const [codeLast, setCodeLast] = useState("")
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([createInitialSizeGroup()])
  const [universalStock, setUniversalStock] = useState(0)

  // Other Tools state
  const [modelName, setModelName] = useState("")
  const [gender, setGender] = useState("")
  const [otherSizeGroups, setOtherSizeGroups] = useState<OtherSizeGroup[]>([createInitialOtherSizeGroup()])

  const resetForm = () => {
    setSelectedTool(TOOL_OPTIONS[0])
    setCodeLast("")
    setSizeGroups([createInitialSizeGroup()])
    setUniversalStock(0)
    setModelName("")
    setGender("")
    setOtherSizeGroups([createInitialOtherSizeGroup()])
    setErrorMsg("")
  }

  // BPM Actions
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
  const addSizeGroup = () => setSizeGroups((prev) => [...prev, createInitialSizeGroup()])
  const removeSizeGroup = (index: number) => setSizeGroups((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)

  // Other Tools Actions
  const updateOtherSizeGroup = (index: number, field: keyof OtherSizeGroup, value: string | number) => {
    setOtherSizeGroups((prev) => {
      const updated = [...prev]
      if (field === "size") {
        updated[index] = { ...updated[index], size: (value as string).toUpperCase() }
      } else if (field === "qty") {
        updated[index] = { ...updated[index], qty: parseInt(value as string, 10) || 0 }
      } else {
        updated[index] = { ...updated[index], [field]: value as string }
      }
      return updated
    })
  }
  const addOtherSizeGroup = () => setOtherSizeGroups((prev) => [...prev, createInitialOtherSizeGroup()])
  const removeOtherSizeGroup = (index: number) => setOtherSizeGroups((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)

  const handleSave = () => {
    setErrorMsg("")
    const payload: {
      toolName: string
      type: string
      size: string
      devStock: number
      modelName?: string
      gender?: string
      satuan?: string
      remark?: string
    }[] = []

    if (selectedTool === "BPM & VAMP PRESS") {
      if (!codeLast.trim()) {
        setErrorMsg("Code Last wajib diisi.")
        return
      }
      let hasValidationError = false
      sizeGroups.forEach((group, index) => {
        const hasStock = group.hotStock > 0 || group.chillerStock > 0 || group.vampPressStock > 0
        if (hasStock && !group.size.trim()) {
          setErrorMsg(`Size wajib diisi pada grup ke-${index + 1} karena memiliki stok > 0.`)
          hasValidationError = true
          return
        }
        if (!group.size.trim()) return

        if (group.hotStock > 0) payload.push({ toolName: "BPM", type: "HOT", size: group.size, devStock: group.hotStock })
        if (group.chillerStock > 0) payload.push({ toolName: "BPM", type: "CHILLER", size: group.size, devStock: group.chillerStock })
        if (group.vampPressStock > 0) payload.push({ toolName: "VAMP PRESS", type: "", size: group.size, devStock: group.vampPressStock })
      })
      if (hasValidationError) return
      if (universalStock > 0) payload.push({ toolName: "UNIVERSAL PAD", type: "", size: "-", devStock: universalStock })
      
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
    } else {
      // Other tools
      if (!modelName.trim()) {
        setErrorMsg("Model wajib diisi.")
        return
      }
      if (!gender) {
        setErrorMsg("Gender wajib dipilih.")
        return
      }

      let hasValidationError = false
      otherSizeGroups.forEach((group, index) => {
        if (group.qty > 0 && !group.size.trim()) {
          setErrorMsg(`Size wajib diisi pada baris ke-${index + 1} karena Qty > 0.`)
          hasValidationError = true
          return
        }
        if (!group.size.trim()) return

        if (group.qty > 0) {
          payload.push({
            toolName: selectedTool,
            type: "",
            size: group.size,
            devStock: group.qty,
            modelName: modelName.trim(),
            gender: gender,
            satuan: group.satuan,
            remark: group.remark.trim()
          })
        }
      })
      if (hasValidationError) return
      
      if (payload.length === 0) {
        setErrorMsg("Minimal satu Size harus diisi dengan Qty > 0.")
        return
      }

      startTransition(async () => {
        // Send "-" as codeLast for other tools
        const res = await addBpmTfmBatchAction("-", payload)
        if (res.success) {
          setIsOpen(false)
          resetForm()
          if (onSuccess) onSuccess()
        } else {
          setErrorMsg(res.message || "Gagal menyimpan data.")
        }
      })
    }
  }

  const isBpm = selectedTool === "BPM & VAMP PRESS"

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
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Tambah Data Inventory Tooling
          </DialogTitle>
          <DialogDescription>
            Pilih jenis barang lalu lengkapi detail ukurannya.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">PILIH BARANG</label>
            <Select value={selectedTool} onValueChange={(val) => {
              setSelectedTool(val as string)
              setErrorMsg("")
            }} disabled={isPending}>
              <SelectTrigger className="w-full font-medium">
                <SelectValue placeholder="Pilih Barang" />
              </SelectTrigger>
              <SelectContent>
                {TOOL_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isBpm ? (
            <>
              {/* BPM & VAMP PRESS FORM */}
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

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">ALOKASI UKURAN & STOK</label>
                <div className="space-y-4">
                  {sizeGroups.map((group, index) => (
                    <div key={index} className="relative border border-slate-200 rounded-lg bg-slate-50/50 p-4 pt-5 shadow-sm">
                      {sizeGroups.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSizeGroup(index)}
                          disabled={isPending}
                          className="absolute top-2 right-2 h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Master Size</label>
                          <Input
                            placeholder="e.g. 3K-5TK"
                            value={group.size}
                            onChange={(e) => updateSizeGroup(index, "size", e.target.value)}
                            disabled={isPending}
                            className="h-9 font-medium bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">BPM HOT</label>
                            <Input
                              type="number" min={0} placeholder="0"
                              value={group.hotStock === 0 ? "" : group.hotStock.toString()}
                              onChange={(e) => updateSizeGroup(index, "hotStock", e.target.value)}
                              disabled={isPending}
                              className="h-9 text-center font-semibold bg-white border-amber-200 focus-visible:ring-amber-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">BPM CHILLER</label>
                            <Input
                              type="number" min={0} placeholder="0"
                              value={group.chillerStock === 0 ? "" : group.chillerStock.toString()}
                              onChange={(e) => updateSizeGroup(index, "chillerStock", e.target.value)}
                              disabled={isPending}
                              className="h-9 text-center font-semibold bg-white border-blue-200 focus-visible:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">VAMP PRESS</label>
                            <Input
                              type="number" min={0} placeholder="0"
                              value={group.vampPressStock === 0 ? "" : group.vampPressStock.toString()}
                              onChange={(e) => updateSizeGroup(index, "vampPressStock", e.target.value)}
                              disabled={isPending}
                              className="h-9 text-center font-semibold bg-white border-emerald-200 focus-visible:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button" variant="outline" size="sm" onClick={addSizeGroup} disabled={isPending}
                  className="w-full mt-2 border-dashed border-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 gap-2 h-10"
                >
                  <Plus className="w-4 h-4" /> Tambah Ukuran Baru
                </Button>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">UNIVERSAL PAD</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Size bersifat universal (-)</p>
                </div>
                <div className="w-24">
                  <Input
                    type="number" min={0} placeholder="0"
                    value={universalStock === 0 ? "" : universalStock.toString()}
                    onChange={(e) => setUniversalStock(parseInt(e.target.value, 10) || 0)}
                    disabled={isPending}
                    className="h-9 text-center font-semibold bg-white"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* OTHER TOOLS FORM */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">MODEL</label>
                  <Input
                    placeholder="Contoh: OZELIA"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    disabled={isPending}
                    className="h-10 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">GENDER</label>
                  <Select value={gender} onValueChange={(val) => setGender(val as string)} disabled={isPending}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Infant">Infant</SelectItem>
                      <SelectItem value="Kid">Kid</SelectItem>
                      <SelectItem value="Men">Men</SelectItem>
                      <SelectItem value="Women">Women</SelectItem>
                      <SelectItem value="Unisex">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">ALOKASI UKURAN & QTY</label>
                <div className="space-y-4">
                  {otherSizeGroups.map((group, index) => (
                    <div key={index} className="relative border border-slate-200 rounded-lg bg-slate-50/50 p-4 pt-8 shadow-sm">
                      {otherSizeGroups.length > 1 && (
                        <Button
                          type="button" variant="ghost" size="sm" onClick={() => removeOtherSizeGroup(index)} disabled={isPending}
                          className="absolute top-2 right-2 h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase">Size</label>
                          <Input
                            placeholder="e.g. 9"
                            value={group.size}
                            onChange={(e) => updateOtherSizeGroup(index, "size", e.target.value)}
                            disabled={isPending}
                            className="h-9 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase">Qty</label>
                          <Input
                            type="number" min={0} placeholder="0"
                            value={group.qty === 0 ? "" : group.qty.toString()}
                            onChange={(e) => updateOtherSizeGroup(index, "qty", e.target.value)}
                            disabled={isPending}
                            className="h-9 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase">Satuan</label>
                          <Select value={group.satuan} onValueChange={(val) => updateOtherSizeGroup(index, "satuan", val as string)} disabled={isPending}>
                            <SelectTrigger className="h-9 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SET">SET</SelectItem>
                              <SelectItem value="EA">EA</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 uppercase">Remark</label>
                          <Input
                            placeholder="Catatan..."
                            value={group.remark}
                            onChange={(e) => updateOtherSizeGroup(index, "remark", e.target.value)}
                            disabled={isPending}
                            className="h-9 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button" variant="outline" size="sm" onClick={addOtherSizeGroup} disabled={isPending}
                  className="w-full mt-2 border-dashed border-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 gap-2 h-10"
                >
                  <Plus className="w-4 h-4" /> Tambah Size Baru
                </Button>
              </div>
            </>
          )}

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
          <Button onClick={handleSave} disabled={isPending || (isBpm ? !codeLast.trim() : (!modelName.trim() || !gender))}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
