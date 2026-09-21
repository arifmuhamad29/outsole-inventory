"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2, Send, Package, Camera, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useSession } from "next-auth/react"
import { submitOutsoleHandoverAction, ScannedHandoverItem } from "@/app/actions/handover"
import { CameraScanner } from "@/components/features/camera-scanner"

const STAGE_OPTIONS = ["MST", "Extreme", "FSR", "SS", "Duplicate", "Other"]

type FormValues = {
  date: string
  recipient: string
  giver: string
  globalStage: string
  globalRemark: string
}

export function OutsoleHandoverForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scannedItems, setScannedItems] = useState<ScannedHandoverItem[]>([])
  
  // Scanner state
  const [inputValue, setInputValue] = useState("")
  const [scanQty, setScanQty] = useState<number>(1)
  const [isProcessingScan, setIsProcessingScan] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      recipient: "",
      giver: "",
      globalStage: "MST",
      globalRemark: ""
    },
  })

  const globalGiver = watch("giver")
  const globalStage = watch("globalStage")
  const globalRemark = watch("globalRemark")

  useEffect(() => {
    if (session?.user && !globalGiver) {
      setValue("giver", session.user.name || session.user.email || "SYSTEM")
    }
  }, [session, globalGiver, setValue])

  // Keep input focused for barcode scanner
  useEffect(() => {
    const focusInput = (e?: Event) => {
      const target = e?.target as HTMLElement | undefined;
      if (target && (target.tagName === "INPUT" || target.tagName === "BUTTON" || target.tagName === "SELECT")) {
        return;
      }
      if (!isProcessingScan && !isCameraOpen && !isSubmitting && inputRef.current) {
        inputRef.current.focus()
      }
    }
    
    focusInput()
    window.addEventListener("click", focusInput)
    window.addEventListener("touchend", focusInput)
    return () => {
      window.removeEventListener("click", focusInput)
      window.removeEventListener("touchend", focusInput)
    }
  }, [isProcessingScan, isCameraOpen, isSubmitting])

  const processScan = async (qrCodeString: string, quantity: number) => {
    if (!qrCodeString.trim() || isProcessingScan) return
    
    const qrCode = qrCodeString.trim()
    setIsProcessingScan(true)
    
    try {
      const res = await fetch("/api/scanner/handover-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode })
      })
      
      const data = await res.json()
      
      if (data.success && data.data) {
        const outsole = data.data
        
        // Check if adding this quantity exceeds available stock
        const existingItemIndex = scannedItems.findIndex(item => item.outsoleId === outsole.id)
        const currentQtyInCart = existingItemIndex >= 0 ? scannedItems[existingItemIndex].qty : 0
        const newTotalQty = currentQtyInCart + quantity
        
        if (newTotalQty > outsole.stock) {
          toast.error(`Gagal: Stok tidak cukup`, { description: `Stok tersisa untuk ${outsole.size} hanya ${outsole.stock}.`})
        } else {
          // Add or update cart
          if (existingItemIndex >= 0) {
            const newItems = [...scannedItems]
            newItems[existingItemIndex].qty = newTotalQty
            setScannedItems(newItems)
          } else {
            setScannedItems(prev => [{
              outsoleId: outsole.id,
              qrCode: outsole.qrCode,
              model: outsole.model,
              article: outsole.article,
              color: outsole.color,
              size: outsole.size,
              qty: quantity,
              stage: globalStage,
              remark: globalRemark
            }, ...prev])
          }
          toast.success(`Berhasil ditambahkan (${outsole.size})`)
        }
      } else {
        toast.error("Gagal scan", { description: data.message })
      }
    } catch (error) {
      toast.error("Error", { description: "Gagal memproses QR Code" })
    } finally {
      setInputValue("")
      setScanQty(1)
      setIsProcessingScan(false)
    }
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    await processScan(inputValue, scanQty)
  }

  const handleCameraScanSuccess = async (decodedText: string) => {
    setIsCameraOpen(false)
    setInputValue(decodedText)
    await processScan(decodedText, scanQty)
  }

  const removeItem = (index: number) => {
    const newItems = [...scannedItems]
    newItems.splice(index, 1)
    setScannedItems(newItems)
  }

  const updateItemStage = (index: number, stage: string) => {
    const newItems = [...scannedItems]
    newItems[index].stage = stage
    setScannedItems(newItems)
  }

  const onSubmit = async (formData: FormValues) => {
    if (scannedItems.length === 0) {
      toast.error("Validasi Gagal", { description: "Keranjang masih kosong. Harap scan barcode terlebih dahulu." })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitOutsoleHandoverAction({
        date: formData.date,
        recipient: formData.recipient,
        giver: formData.giver,
        items: scannedItems
      })

      if (res.success) {
        toast.success("Sukses!", { description: res.message })
        router.push("/handover")
      } else {
        toast.error("Gagal", { description: res.message })
        setIsSubmitting(false)
      }
    } catch (error) {
      toast.error("Error", { description: "Terjadi kesalahan sistem saat menyimpan handover" })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Informasi Handover Outsole
          </CardTitle>
          <CardDescription>Isi detail serah terima lalu scan barcode outsole yang akan di-handover.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tanggal</label>
              <Input type="date" {...register("date", { required: "Tanggal wajib diisi" })} className="h-10 bg-white dark:bg-gray-800" />
              {errors.date && <p className="text-xs text-red-500 font-medium">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Penerima / Line</label>
              <Input placeholder="e.g. LINE 3 - ASSY" {...register("recipient", { required: "Penerima wajib diisi" })} className="h-10 bg-white dark:bg-gray-800" />
              {errors.recipient && <p className="text-xs text-red-500 font-medium">{errors.recipient.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scanner Section */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-4 border-b border-primary/10">
          <CardTitle className="text-base font-semibold">Barcode Scanner</CardTitle>
          <CardDescription>Pilih Stage default, lalu scan QR Code barang.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Default Stage</label>
              <select
                {...register("globalStage")}
                className="w-full h-10 rounded-md border border-primary/20 bg-white dark:bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Default Remark</label>
              <Input placeholder="Catatan (opsional)..." {...register("globalRemark")} className="h-10 border-primary/20 bg-white dark:bg-gray-800" />
            </div>
          </div>

          <form onSubmit={handleScan} className="flex flex-col md:flex-row gap-4 md:gap-2">
              <div className="flex gap-2 flex-1">
                <div className="w-20 md:w-24 shrink-0 flex flex-col">
                  <span className="text-xs text-muted-foreground mb-1">Qty</span>
                  <Input
                    type="number"
                    min="1"
                    value={scanQty}
                    onChange={(e) => setScanQty(parseInt(e.target.value) || 1)}
                    disabled={isProcessingScan || isSubmitting}
                    className="text-center text-xl h-14 shadow-sm border-primary/30"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-xs text-muted-foreground mb-1">Scan QR Code</span>
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isProcessingScan || isSubmitting}
                    placeholder="Arahkan kursor kesini..."
                    className="text-center md:text-xl h-14 font-mono tracking-widest border-primary/30 shadow-sm bg-white dark:bg-slate-900"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="flex flex-row md:items-end gap-2 shrink-0">
                <Button
                  type="submit"
                  disabled={isProcessingScan || isSubmitting || !inputValue.trim()}
                  className="flex-1 md:flex-none h-14 md:px-6 font-bold"
                >
                  OK
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isProcessingScan || isSubmitting}
                  className="h-14 w-14 shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setIsCameraOpen(true)}
                  title="Scan with Camera"
                >
                  <Camera className="h-6 w-6" />
                </Button>
              </div>
            </form>
        </CardContent>
      </Card>

      {/* Camera Dialog */}
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Arahkan kamera ke QR Code outsole.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {isCameraOpen && (
              <CameraScanner
                onScanSuccess={handleCameraScanSuccess}
                onScanError={(err) => console.log(err)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cart Items */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center justify-between">
          <span>Keranjang Handover ({scannedItems.length} item)</span>
          {scannedItems.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">Total: {scannedItems.reduce((acc, curr) => acc + curr.qty, 0)} PRS</span>
          )}
        </h3>
        
        {scannedItems.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground bg-slate-50 dark:bg-slate-900/50">
            Belum ada barang yang di-scan.
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {scannedItems.map((item, idx) => (
              <Card key={`${item.outsoleId}-${idx}`} className="border shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-sm truncate">{item.model} - {item.article}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Qty: {item.qty}
                        </span>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeItem(idx)}
                          className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span>Sz: <strong className="text-foreground">{item.size}</strong></span>
                      <span>Color: {item.color}</span>
                      <div className="flex items-center gap-2">
                        <span>Stage:</span>
                        <select
                          value={item.stage}
                          onChange={(e) => updateItemStage(idx, e.target.value)}
                          className="h-6 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-1 text-xs focus:outline-none"
                        >
                          {STAGE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end pt-4 pb-6">
        <Button 
          type="button" 
          onClick={handleSubmit(onSubmit)} 
          disabled={isSubmitting || scannedItems.length === 0} 
          className="gap-2 px-8 h-12 text-base font-semibold shadow-md w-full md:w-auto"
        >
          {isSubmitting ? (
            <><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> Memproses...</>
          ) : (
            <><Send className="w-5 h-5" /> Selesaikan Handover</>
          )}
        </Button>
      </div>
    </div>
  )
}
