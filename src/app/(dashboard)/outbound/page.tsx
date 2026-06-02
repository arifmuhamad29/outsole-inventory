"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CheckCircle2, XCircle, Camera } from "lucide-react"
import { CameraScanner } from "@/components/features/camera-scanner"

type ScanResult = {
  qrCode: string
  status: "success" | "error"
  message: string
  timestamp: Date
}

export default function OutboundPage() {
  const [inputValue, setInputValue] = useState("")
  const [scanQty, setScanQty] = useState<number>(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [history, setHistory] = useState<ScanResult[]>([])
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep input focused for barcode scanner
  useEffect(() => {
    const focusInput = () => {
      if (!isProcessing && !isCameraOpen && inputRef.current) {
        inputRef.current.focus()
      }
    }
    
    focusInput()
    window.addEventListener("click", focusInput)
    return () => window.removeEventListener("click", focusInput)
  }, [isProcessing, isCameraOpen])

  async function processScan(qrCodeString: string, quantity: number) {
    if (!qrCodeString.trim() || isProcessing) return

    const qrCode = qrCodeString.trim()
    setIsProcessing(true)
    
    try {
      const res = await fetch("/api/scanner/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode, quantity })
      })
      
      const data = await res.json()
      
      setHistory(prev => [{
        qrCode,
        status: (data.success ? "success" : "error") as "success" | "error",
        message: data.message,
        timestamp: new Date()
      }, ...prev].slice(0, 10)) // Keep last 10 scans

    } catch {
      setHistory(prev => [{
        qrCode,
        status: "error" as "success" | "error",
        message: "Network error occurred",
        timestamp: new Date()
      }, ...prev].slice(0, 10))
    } finally {
      setInputValue("")
      setScanQty(1)
      setIsProcessing(false)
      // Focus will be restored by useEffect
    }
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    await processScan(inputValue, scanQty)
  }

  const handleCameraScanSuccess = async (decodedText: string) => {
    setIsCameraOpen(false)
    setInputValue(decodedText)
    await processScan(decodedText, scanQty)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Outbound Scanner</h1>
        <p className="text-muted-foreground mt-2">
          Scan QR codes to deduct stock. The input is always active.
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Scanner Ready</CardTitle>
          <CardDescription>Use your barcode scanner or type the QR code manually and press Enter.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-2">
            <div className="w-24 shrink-0 flex flex-col">
              <span className="text-xs text-muted-foreground mb-1">Qty Multiplier</span>
              <Input
                type="number"
                min="1"
                value={scanQty}
                onChange={(e) => setScanQty(parseInt(e.target.value) || 1)}
                disabled={isProcessing}
                title="Quantity Multiplier"
                className="text-center text-xl h-16 shadow-sm border-primary/50"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <span className="text-xs text-muted-foreground mb-1">QR Code</span>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isProcessing}
                placeholder="Waiting for scan..."
                className="text-center text-2xl h-16 font-mono tracking-widest border-primary/50 shadow-sm"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-16 w-16 shrink-0"
                onClick={() => setIsCameraOpen(true)}
                title="Scan with Camera"
              >
                <Camera className="h-8 w-8 text-primary" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at the QR code. Make sure you grant camera permissions if prompted.
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

      {history.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Scans</h3>
          <div className="space-y-3">
            {history.map((scan, i) => (
              <Card key={i} className={`border-l-4 ${scan.status === "success" ? "border-l-green-500" : "border-l-red-500"}`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    {scan.status === "success" ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium font-mono">{scan.qrCode}</p>
                      <p className={`text-sm ${scan.status === "success" ? "text-green-600" : "text-red-600"}`}>
                        {scan.message}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {scan.timestamp.toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
