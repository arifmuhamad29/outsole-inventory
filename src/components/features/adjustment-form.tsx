"use client"

import { useState } from "react"
import { processAdjustmentAction } from "@/app/actions/inventory"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Camera } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CameraScanner } from "@/components/features/camera-scanner"

type Outsole = {
  id: string
  qrCode: string
  model: string
  article: string
  color: string
  size: string
  stock: number
}

export function AdjustmentForm({ outsoles }: { outsoles: Outsole[] }) {
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState<{ type: "error" | "success", text: string } | null>(null)
  
  const [selectedOutsoleId, setSelectedOutsoleId] = useState<string>("")
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  
  const selectedOutsole = outsoles.find(o => o.id === selectedOutsoleId)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setMessage(null)

    const formData = new FormData(event.currentTarget)
    
    try {
      const response = await processAdjustmentAction(formData)
      if (response.success) {
        setMessage({ type: "success", text: response.message })
        setSelectedOutsoleId("")
        ;(event.target as HTMLFormElement).reset()
      } else {
        setMessage({ type: "error", text: response.message || "Failed" })
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" })
    } finally {
      setIsPending(false)
    }
  }

  const handleCameraScanSuccess = (decodedText: string) => {
    setIsCameraOpen(false)
    
    const matchedItem = outsoles.find(o => o.qrCode === decodedText.trim())
    if (matchedItem) {
      setSelectedOutsoleId(matchedItem.id)
      setMessage(null)
    } else {
      setMessage({ type: "error", text: `Item with QR code ${decodedText} not found in stock.` })
    }
  }

  return (
    <>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Manual Stock Adjustment</CardTitle>
          <CardDescription>Adjust the stock level of an item and provide a reason.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium" htmlFor="outsoleId">Select Item</label>
              <input type="hidden" name="outsoleId" value={selectedOutsoleId} required />
              <div className="flex gap-2">
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger render={
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="flex-1 justify-between"
                    >
                      {selectedOutsole
                        ? `[${selectedOutsole.qrCode}] - ${selectedOutsole.model} (${selectedOutsole.article}, ${selectedOutsole.color}, Size: ${selectedOutsole.size})`
                        : "-- Select an item --"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  } />
                  <PopoverContent className="w-[400px] sm:w-[500px] p-0" align="start">
                    <Command filter={(value, search) => {
                      const item = outsoles.find(o => o.id === value)
                      if (!item) return 0
                      const searchStr = `${item.qrCode} ${item.model} ${item.article} ${item.color}`.toLowerCase()
                      return searchStr.includes(search.toLowerCase()) ? 1 : 0
                    }}>
                      <CommandInput placeholder="Search item..." />
                      <CommandList>
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup>
                          {outsoles.map((o) => (
                            <CommandItem
                              key={o.id}
                              value={o.id}
                              onSelect={(currentValue) => {
                                setSelectedOutsoleId(currentValue === selectedOutsoleId ? "" : currentValue)
                                setComboboxOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedOutsoleId === o.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              [{o.qrCode}] - {o.model} ({o.article}, {o.color}, Size: {o.size}) - Stock: {o.stock}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 px-3"
                  onClick={() => setIsCameraOpen(true)}
                  title="Scan with Camera"
                >
                  <Camera className="h-5 w-5 text-primary" />
                </Button>
              </div>
            </div>

            {selectedOutsole && (
              <div className="p-3 bg-gray-50 border rounded-md text-sm space-y-1">
                <p>Current Stock: <strong>{selectedOutsole.stock}</strong></p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="newStock">New Stock Level</label>
              <Input id="newStock" name="newStock" type="number" min="0" required placeholder="e.g. 5" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="notes">Reason for Adjustment</label>
              <Input id="notes" name="notes" required minLength={5} placeholder="e.g. Found 2 missing pairs in warehouse" />
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending || !selectedOutsoleId}>
              {isPending ? "Processing..." : "Submit Adjustment"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at the QR code to select an item for adjustment.
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
    </>
  )
}
