"use client"

import { useState } from "react"
import { processInboundAction } from "@/app/actions/inventory"
import { PrintableLabel } from "@/components/ui/printable-label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function InboundForm() {
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState<{ type: "error" | "success", text: string } | null>(null)
  const [generatedQR, setGeneratedQR] = useState<string | null>(null)
  const [outsoleData, setOutsoleData] = useState<Record<string, unknown> | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setMessage(null)
    setGeneratedQR(null)

    const formData = new FormData(event.currentTarget)
    
    try {
      const response = await processInboundAction(formData)
      if (response.success && response.data) {
        setMessage({ type: "success", text: response.message })
        setGeneratedQR(response.data.qrCode)
        setOutsoleData(response.data)
        ;(event.target as HTMLFormElement).reset()
      } else {
        if (response.errors) {
          console.error("Validation Errors:", response.errors)
          const errorDetails = Object.entries(response.errors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
            .join(" | ")
          setMessage({ type: "error", text: `${response.message} - ${errorDetails}` })
        } else {
          setMessage({ type: "error", text: response.message || "Failed" })
        }
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Inbound Stock</CardTitle>
          <CardDescription>Enter details to add new stock or create a new SKU.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="model">Model Name</label>
              <Input id="model" name="model" required placeholder="e.g. Air Max 90" className="uppercase" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="article">Article</label>
              <Input id="article" name="article" required placeholder="e.g. GX1234" className="uppercase" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="color">Color</label>
                <Input id="color" name="color" required placeholder="e.g. Red/White" className="uppercase" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="size">Size</label>
                <select
                  id="size"
                  name="size"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue=""
                >
                  <option value="" disabled>Select size</option>
                  <optgroup label="Infant">
                    {["3K", "4K", "5K", "5TK", "6K", "6TK", "7K", "7TK", "8K", "8TK", "9K", "9TK"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Kids">
                    {["10K", "10TK", "11K", "11TK", "12K", "12TK", "13K", "13TK", "1", "1T", "2", "2T", "3", "3T", "4", "4T", "5", "5T", "6", "6T"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Men/Women">
                    {["3", "3T", "4", "4T", "5", "5T", "6", "6T", "7", "7T", "8", "8T", "9", "9T", "10", "10T", "11", "11T", "12", "12T", "13", "13T", "14", "14T", "15", "15T"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="qty">Quantity</label>
              <Input id="qty" name="qty" type="number" min="1" required placeholder="e.g. 10" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="notes">Notes (Optional)</label>
              <Input id="notes" name="notes" placeholder="e.g. Delivery from Vendor A" />
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Processing..." : "Submit Inbound"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {generatedQR && outsoleData && (
        <Card id="printable-label" className="flex flex-col items-center justify-center text-center p-6 bg-white text-black border-dashed border-2 m-0">
          <CardHeader className="no-print">
            <CardTitle className="text-green-600">Success!</CardTitle>
            <CardDescription>QR Code generated for {String(outsoleData.model)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <PrintableLabel 
              qrCode={generatedQR} 
              model={String(outsoleData.model)} 
              article={String(outsoleData.article)} 
              color={String(outsoleData.color)} 
              size={String(outsoleData.size)} 
              createdAt={outsoleData.createdAt as string}
              notes={outsoleData.notes ? String(outsoleData.notes) : undefined}
            />
            <Button variant="outline" onClick={() => window.print()} className="no-print">
              Print Label
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
