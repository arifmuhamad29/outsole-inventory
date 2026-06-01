"use client"

import { useState, useRef, useEffect } from "react"
import { submitOpnameItemAction } from "@/app/actions/opname"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function OpnameScanner({ sessionId }: { sessionId: string }) {
  const [qrCode, setQrCode] = useState("")
  const [physicalStock, setPhysicalStock] = useState<number | "">("")
  const [message, setMessage] = useState<{ type: "error" | "success", text: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const qrRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isProcessing && qrRef.current) {
      qrRef.current.focus()
    }
  }, [isProcessing])

  async function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!qrCode.trim() || physicalStock === "" || isProcessing) return

    setIsProcessing(true)
    setMessage(null)

    const res = await submitOpnameItemAction(sessionId, qrCode.trim(), Number(physicalStock))
    
    if (res.success) {
      setMessage({ type: "success", text: `Saved count for ${qrCode}` })
      setQrCode("")
      setPhysicalStock("")
      if (qrRef.current) qrRef.current.focus()
    } else {
      setMessage({ type: "error", text: res.message || "Failed" })
    }
    
    setIsProcessing(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan Item</CardTitle>
        <CardDescription>Scan the QR code and enter the actual physical stock counted.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleScanSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">QR Code</label>
              <Input
                ref={qrRef}
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                disabled={isProcessing}
                placeholder="Scan or type QR Code"
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Physical Stock Count</label>
              <Input
                type="number"
                min="0"
                value={physicalStock}
                onChange={(e) => setPhysicalStock(e.target.value ? Number(e.target.value) : "")}
                disabled={isProcessing}
                placeholder="0"
                required
              />
            </div>
          </div>
          
          {message && (
            <div className={`p-3 rounded-md text-sm ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
              {message.text}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? "Saving..." : "Save Count"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
