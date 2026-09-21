"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { CheckCircle2, XCircle, Camera, Search } from "lucide-react"
import { CameraScanner } from "@/components/features/camera-scanner"

type Outsole = {
  id: string
  qrCode: string
  model: string
  article: string
  color: string
  size: string
  stock: number
  component?: string | null
}

type ScanResult = {
  qrCode: string
  status: "success" | "error"
  message: string
  timestamp: Date
}

export function OutboundClient({ outsoles }: { outsoles: Outsole[] }) {
  const [inputValue, setInputValue] = useState("")
  const [scanQty, setScanQty] = useState<number>(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [history, setHistory] = useState<ScanResult[]>([])
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  
  const [comboboxOpen, setComboboxOpen] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep input focused for barcode scanner
  useEffect(() => {
    const focusInput = (e?: Event) => {
      // If the user is actively tapping on an input or button, don't steal their focus
      const target = e?.target as HTMLElement | undefined;
      if (target && (target.tagName === "INPUT" || target.tagName === "BUTTON")) {
        return;
      }

      if (!isProcessing && !isCameraOpen && !comboboxOpen && inputRef.current) {
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
  }, [isProcessing, isCameraOpen, comboboxOpen])

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outbound Scanner</h1>
          <p className="text-muted-foreground mt-2">
            Scan QR codes to deduct stock. The input is always active.
          </p>
        </div>
        
        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
          <PopoverTrigger render={
            <Button variant="outline" className="gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/50">
              <Search className="h-4 w-4" />
              Pencarian Manual
            </Button>
          } />
          <PopoverContent className="w-[320px] sm:w-[500px] p-0" align="end">
            <Command filter={(value, search) => {
              const item = outsoles.find(o => o.id === value)
              if (!item) return 0
              const searchStr = `${item.qrCode} ${item.model} ${item.article} ${item.component || ""} ${item.color}`.toLowerCase()
              return searchStr.includes(search.toLowerCase()) ? 1 : 0
            }}>
              <CommandInput placeholder="Cari model, article, component, color..." />
              <CommandList>
                <CommandEmpty>Barang tidak ditemukan.</CommandEmpty>
                <CommandGroup>
                  {outsoles.map((o) => {
                    const articleDisplay = o.article + (o.component && o.component !== "-" ? ` - ${o.component}` : "")
                    return (
                      <CommandItem
                        key={o.id}
                        value={o.id}
                        onSelect={(currentValue) => {
                          const selected = outsoles.find(x => x.id === currentValue)
                          if (selected) {
                            setInputValue(selected.qrCode)
                            setComboboxOpen(false)
                            if (inputRef.current) inputRef.current.focus()
                          }
                        }}
                      >
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex justify-between items-center w-full">
                            <span className="font-semibold text-sm">[{o.qrCode}] {o.model}</span>
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Stock: {o.stock}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{articleDisplay}, {o.color}, Size: {o.size}</span>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Scanner Ready</CardTitle>
          <CardDescription>Use your barcode scanner or type the QR code manually and press Enter.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 w-full">
              <div className="w-20 sm:w-24 shrink-0 flex flex-col">
                <span className="text-xs text-muted-foreground mb-1">Qty Multiplier</span>
                <Input
                  type="number"
                  min="1"
                  value={scanQty}
                  onChange={(e) => setScanQty(parseInt(e.target.value) || 1)}
                  disabled={isProcessing}
                  title="Quantity Multiplier"
                  className="text-center text-xl h-14 sm:h-16 shadow-sm border-primary/50"
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
                  className="text-center text-lg sm:text-2xl h-14 sm:h-16 font-mono tracking-widest border-primary/50 shadow-sm"
                  autoComplete="off"
                />
              </div>
            </div>
            
            <div className="flex flex-row sm:items-end gap-2 shrink-0 mt-1 sm:mt-0 w-full sm:w-auto">
              <Button
                type="submit"
                disabled={isProcessing || !inputValue.trim()}
                className="h-14 sm:h-16 px-6 font-bold flex-1 sm:flex-none"
                title="Submit / Process"
              >
                OK
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 sm:h-16 w-14 sm:w-16 shrink-0"
                onClick={() => setIsCameraOpen(true)}
                title="Scan with Camera"
              >
                <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
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
