"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { DashboardActions } from "@/components/features/dashboard-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Outsole, Transaction } from "@prisma/client"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { PrintableLabel } from "@/components/ui/printable-label"

type OutsoleWithTransactions = Outsole & {
  transactions?: Transaction[]
}

export interface InventoryTableProps {
  outsoles: OutsoleWithTransactions[];
  isAdmin?: boolean;
  readOnly?: boolean;
}

export function InventoryTable({ outsoles, isAdmin = false, readOnly = false }: InventoryTableProps) {
  const [selectedItems, setSelectedItems] = useState<OutsoleWithTransactions[]>([])
  const [isPrinting, setIsPrinting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(outsoles)
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectRow = (checked: boolean, item: OutsoleWithTransactions) => {
    if (checked) {
      setSelectedItems(prev => [...prev, item])
    } else {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id))
    }
  }

  const handleBulkPrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
      setSelectedItems([])
    }, 150)
  }

  const allSelected = outsoles.length > 0 && selectedItems.length === outsoles.length

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }
  const barcodePages = chunkArray(selectedItems, 6)

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {!readOnly && selectedItems.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md border print:hidden">
          <span className="text-sm font-medium">{selectedItems.length} items selected</span>
          <Button variant="default" onClick={handleBulkPrint}>
            <Printer className="w-4 h-4 mr-2" />
            Bulk Print ({selectedItems.length} Items)
          </Button>
        </div>
      )}

      {/* Actual printable content rendered via Portal directly into body */}
      {isPrinting && mounted && createPortal(
        <div className="print-container hidden print:block w-full absolute top-0 left-0 bg-white z-[9999]">
          {barcodePages.map((pageItems, pageIndex) => (
            <div
              key={pageIndex}
              className="w-full min-h-screen p-2 grid grid-cols-3 gap-x-4 gap-y-4 content-start"
              style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              {pageItems.map((item) => (
                <div key={item.id} className="border border-gray-200 p-2 rounded-md flex flex-col items-center justify-center bg-white text-black text-center estimation-box">
                  <PrintableLabel
                    qrCode={item.qrCode}
                    model={item.model}
                    article={item.article}
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

      <div className="rounded-md border bg-white dark:bg-gray-800 overflow-x-auto print:hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              {!readOnly && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>QR Code</TableHead>
              <TableHead>PO Number</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Article</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Bottom</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Last Outbound</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              {!readOnly && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {outsoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 11 : 13} className="text-center h-24 text-muted-foreground">
                  No inventory found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              outsoles.map((item) => (
                <TableRow key={item.id} className={selectedItems.some(i => i.id === item.id) ? "bg-muted/50" : ""}>
                  {!readOnly && (
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.some(i => i.id === item.id)}
                        onCheckedChange={(checked) => handleSelectRow(checked as boolean, item)}
                        aria-label={`Select item ${item.qrCode}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{item.qrCode}</TableCell>
                  <TableCell>{item.poNumber || "-"}</TableCell>
                  <TableCell>{item.model}</TableCell>
                  <TableCell>{item.article}</TableCell>
                  <TableCell>{item.color}</TableCell>
                  <TableCell>{item.bottomTreatment && item.bottomTreatment !== "None" ? item.bottomTreatment : "-"}</TableCell>
                  <TableCell>{item.size}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={item.notes || "-"}>{item.notes || "-"}</TableCell>
                  <TableCell>
                    {item.transactions && item.transactions.length > 0
                      ? format(new Date(item.transactions[0].createdAt), "dd MMM yyyy, HH:mm")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{item.stock}</TableCell>
                  <TableCell>
                    {item.stock <= item.minimumStock ? (
                      <Badge variant="destructive">Low Stock</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">
                        In Stock
                      </Badge>
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <DashboardActions item={item} isAdmin={isAdmin} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
