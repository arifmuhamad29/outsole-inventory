"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PrintableLabel } from "@/components/ui/printable-label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Printer } from "lucide-react"

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export function DashboardActions({ item, isAdmin }: { 
  item: { id: string, qrCode: string, model: string, article: string, color: string, size: string, poNumber?: string | null, bottomTreatment?: string | null, notes?: string | null, createdAt?: Date | string, component?: string | null }, 
  isAdmin: boolean 
}) {
  const [isPrintOpen, setIsPrintOpen] = useState(false)
  const [printQty, setPrintQty] = useState(1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <div className="flex items-center gap-2 print:hidden justify-center">
        {/* Print QR Dialog */}
        <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" title="Print QR">
              <Printer className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] print:hidden">
            <DialogHeader>
              <DialogTitle>Print QR Code</DialogTitle>
            </DialogHeader>
            {/* We keep a preview here but it won't be printed */}
            <div className="p-4 border rounded-md">
              <PrintableLabel 
                qrCode={item.qrCode} 
                model={item.model} 
                article={item.article + (item.component && item.component !== "-" ? ` - ${item.component}` : "")} 
                color={item.color} 
                size={item.size} 
                poNumber={item.poNumber ? String(item.poNumber) : undefined}
                bottomTreatment={item.bottomTreatment ? String(item.bottomTreatment) : undefined}
                createdAt={item.createdAt}
                notes={item.notes ? String(item.notes) : undefined}
              />
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Copy:</label>
                <Input 
                  type="number" 
                  min={1} 
                  value={printQty} 
                  onChange={(e) => setPrintQty(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
              </div>
              <Button onClick={() => window.print()}>
                Print Label
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Actual printable content rendered via Portal directly into body to prevent any layout interference */}
      {isPrintOpen && mounted && createPortal(
        <div className="print-container hidden print:block w-full absolute top-0 left-0 bg-white z-[9999]">
          {chunkArray(Array.from({ length: printQty }), 16).map((pageItems, pageIndex) => (
            <div
              key={pageIndex}
              className="w-full min-h-screen p-2 grid grid-cols-4 gap-x-2 gap-y-2 content-start"
              style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              {pageItems.map((_, idx) => (
                <div key={idx} className="border border-gray-200 p-2 rounded-md flex flex-col items-center justify-center bg-white text-black text-center estimation-box">
                  <PrintableLabel 
                    qrCode={item.qrCode} 
                    model={item.model} 
                    article={item.article + (item.component && item.component !== "-" ? ` - ${item.component}` : "")} 
                    color={item.color} 
                    size={item.size} 
                    poNumber={item.poNumber ? String(item.poNumber) : undefined}
                    bottomTreatment={item.bottomTreatment ? String(item.bottomTreatment) : undefined}
                    createdAt={item.createdAt}
                    notes={item.notes ? String(item.notes) : undefined}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
