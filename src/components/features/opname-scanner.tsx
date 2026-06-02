"use client"

import { useState, useRef, useEffect } from "react"
import { submitOpnameItemAction, getOutsoleByQrCodeAction } from "@/app/actions/opname"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Camera, Search, X } from "lucide-react"
import { CameraScanner } from "@/components/features/camera-scanner"

const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch (e) {
    console.error("Audio beep failed", e)
  }
}

export function OpnameScanner({ sessionId }: { sessionId: string }) {
  const [qrCode, setQrCode] = useState("")
  const [physicalStock, setPhysicalStock] = useState<number | "">("")
  const [message, setMessage] = useState<{ type: "error" | "success", text: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedItem, setScannedItem] = useState<{ model: string, article: string, color: string, size: string, stock: number } | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  
  const qrRef = useRef<HTMLInputElement>(null)
  const stockRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isProcessing && !isCameraOpen && qrRef.current && !scannedItem) {
      qrRef.current.focus()
    }
  }, [isProcessing, isCameraOpen, scannedItem])

  async function fetchItemDetails(qr: string) {
    setIsProcessing(true)
    setMessage(null)
    const res = await getOutsoleByQrCodeAction(qr)
    if (res.success && res.data) {
      setScannedItem(res.data)
      playBeep()
      setTimeout(() => {
        if (stockRef.current) stockRef.current.focus()
      }, 100)
    } else {
      setMessage({ type: "error", text: res.message || "Item not found" })
      setScannedItem(null)
    }
    setIsProcessing(false)
  }

  async function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Step 1: Fetch item if not fetched yet
    if (!scannedItem) {
      if (!qrCode.trim() || isProcessing) return
      await fetchItemDetails(qrCode.trim())
      return
    }

    // Step 2: Submit physical count
    if (physicalStock === "" || isProcessing) return

    setIsProcessing(true)
    setMessage(null)

    const res = await submitOpnameItemAction(sessionId, qrCode.trim(), Number(physicalStock))
    
    if (res.success) {
      setMessage({ type: "success", text: `Saved count for ${qrCode}` })
      setQrCode("")
      setPhysicalStock("")
      setScannedItem(null)
      if (qrRef.current) qrRef.current.focus()
    } else {
      setMessage({ type: "error", text: res.message || "Failed" })
    }
    
    setIsProcessing(false)
  }

  const handleCameraScanSuccess = async (decodedText: string) => {
    setIsCameraOpen(false)
    setQrCode(decodedText)
    await fetchItemDetails(decodedText)
  }

  const handleClear = () => {
    setScannedItem(null)
    setQrCode("")
    setPhysicalStock("")
    setMessage(null)
    setTimeout(() => {
      if (qrRef.current) qrRef.current.focus()
    }, 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan Item</CardTitle>
        <CardDescription>Scan the QR code and enter the actual physical stock counted.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleScanSubmit} className="space-y-6">
          <div className="space-y-4">
            
            {/* Step 1: QR Code Entry */}
            <div className="space-y-2">
              <label className="text-sm font-medium">1. Identify Item (QR Code)</label>
              <div className="flex gap-2">
                <Input
                  ref={qrRef}
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  disabled={isProcessing || !!scannedItem}
                  placeholder="Scan or type QR Code"
                  className="font-mono flex-1"
                  required
                />
                {!scannedItem ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCameraOpen(true)}
                    disabled={isProcessing}
                    title="Scan with Camera"
                    className="shrink-0"
                  >
                    <Camera className="h-4 w-4 mr-2" /> Scan
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClear}
                    disabled={isProcessing}
                    title="Clear Selection"
                    className="shrink-0 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Step 1 Submit Button (Visible only when no item is selected) */}
            {!scannedItem && (
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isProcessing || !qrCode.trim()}
              >
                <Search className="h-4 w-4 mr-2" /> Find Item
              </Button>
            )}

            {/* Item Preview */}
            {scannedItem && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Model:</span> <span className="font-semibold">{scannedItem.model}</span></div>
                  <div><span className="text-muted-foreground">Article:</span> <span className="font-semibold">{scannedItem.article}</span></div>
                  <div><span className="text-muted-foreground">Color:</span> <span className="font-semibold">{scannedItem.color}</span></div>
                  <div><span className="text-muted-foreground">Size:</span> <span className="font-semibold">{scannedItem.size}</span></div>
                </div>
                <div className="pt-2 border-t mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">System Stock:</span>
                  <span className="text-lg font-bold">{scannedItem.stock}</span>
                </div>
              </div>
            )}

            {/* Step 2: Physical Count Entry */}
            {scannedItem && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-medium">2. Actual Physical Count</label>
                <Input
                  ref={stockRef}
                  type="number"
                  min="0"
                  value={physicalStock}
                  onChange={(e) => setPhysicalStock(e.target.value ? Number(e.target.value) : "")}
                  disabled={isProcessing}
                  placeholder="Enter counted physical stock"
                  className="text-lg h-12 font-semibold"
                  required
                />
              </div>
            )}
          </div>
          
          {message && (
            <div className={`p-3 rounded-md text-sm ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
              {message.text}
            </div>
          )}

          {/* Final Submit Button */}
          {scannedItem && (
            <div className="flex gap-2 justify-end pt-2">
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isProcessing || physicalStock === ""}>
                {isProcessing ? "Saving..." : "Save Physical Count"}
              </Button>
            </div>
          )}
        </form>
      </CardContent>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at the item&apos;s QR code.
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
    </Card>
  )
}
