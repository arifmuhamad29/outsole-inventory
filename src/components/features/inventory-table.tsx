"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Badge } from "@/components/ui/badge"
import { DashboardActions } from "@/components/features/dashboard-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Outsole, Transaction } from "@prisma/client"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Printer, Loader2, History, ArrowUpCircle, ArrowDownCircle, Settings2 } from "lucide-react"
import { PrintableLabel } from "@/components/ui/printable-label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { getItemTransactionHistory } from "@/app/actions/inventory"

type OutsoleWithTransactions = Outsole & {
  transactions?: Transaction[]
}

type HistoryLog = {
  id: string
  type: string
  qty: number
  notes: string | null
  operatorName: string
  createdAt: string
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

  // History Dialog state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null)
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

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

  const handleViewHistory = async (outsoleId: string, qrCode: string) => {
    setSelectedQrCode(qrCode)
    setIsHistoryOpen(true)
    setIsHistoryLoading(true)
    setHistoryLogs([])
    try {
      const data = await getItemTransactionHistory(outsoleId)
      setHistoryLogs(data)
    } catch {
      toast.error("Failed to load transaction history")
    } finally {
      setIsHistoryLoading(false)
    }
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "INBOUND":
        return <ArrowDownCircle className="h-3.5 w-3.5 text-blue-500" />
      case "OUTBOUND":
        return <ArrowUpCircle className="h-3.5 w-3.5 text-orange-500" />
      case "ADJUSTMENT":
        return <Settings2 className="h-3.5 w-3.5 text-amber-500" />
      default:
        return null
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "INBOUND":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
      case "OUTBOUND":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
      case "ADJUSTMENT":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
      case "STOCK_OPNAME":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getQtyDisplay = (type: string, qty: number) => {
    switch (type) {
      case "INBOUND":
        return <span className="text-green-600 dark:text-green-400 font-semibold">+{qty}</span>
      case "OUTBOUND":
        return <span className="text-red-600 dark:text-red-400 font-semibold">-{qty}</span>
      case "ADJUSTMENT":
        return <span className="text-amber-600 dark:text-amber-400 font-semibold">~{qty}</span>
      default:
        return <span className="font-semibold">{qty}</span>
    }
  }

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
              <TableHead>Last Inbound</TableHead>
              <TableHead>Last Outbound</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              {!readOnly && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {outsoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 12 : 14} className="text-center h-24 text-muted-foreground">
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
                  <TableCell
                    className="font-mono text-xs text-blue-600 hover:underline cursor-pointer font-semibold transition-colors hover:text-blue-800"
                    onClick={() => handleViewHistory(item.id, item.qrCode)}
                    title="Click to view transaction history"
                  >
                    {item.qrCode}
                  </TableCell>
                  <TableCell>{item.poNumber || "-"}</TableCell>
                  <TableCell>{item.model}</TableCell>
                  <TableCell>{item.article}</TableCell>
                  <TableCell>{item.color}</TableCell>
                  <TableCell>{item.bottomTreatment && item.bottomTreatment !== "None" ? item.bottomTreatment : "-"}</TableCell>
                  <TableCell>{item.size}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={item.notes || "-"}>{item.notes || "-"}</TableCell>
                  <TableCell>
                    {item.transactions?.find(t => t.type === 'INBOUND')
                      ? new Date(item.transactions.find(t => t.type === 'INBOUND')!.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {item.transactions?.find(t => t.type === 'OUTBOUND')
                      ? new Date(item.transactions.find(t => t.type === 'OUTBOUND')!.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
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

      {/* Transaction History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              Transaction History
            </DialogTitle>
            <DialogDescription>
              Full activity log for <span className="font-mono font-bold text-foreground">{selectedQrCode}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {isHistoryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-10" />
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-32 flex-1" />
                  </div>
                ))}
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="h-10 w-10 opacity-30 mb-3" />
                <p className="text-sm font-medium">No transaction records found</p>
                <p className="text-xs mt-1">This item has no recorded movements yet.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead className="whitespace-nowrap text-xs font-semibold">Date & Time</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Qty (PRS)</TableHead>
                      <TableHead className="text-xs font-semibold">Operator</TableHead>
                      <TableHead className="text-xs font-semibold">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-GB", {
                            timeZone: "Asia/Jakarta",
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}{" "}
                          WIB
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${getTypeColor(log.type)}`}>
                            {getTypeIcon(log.type)}
                            {log.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {getQtyDisplay(log.type, log.qty)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.operatorName}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px]">
                          <div className="truncate" title={log.notes || "-"}>
                            {log.notes || <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!isHistoryLoading && historyLogs.length > 0 && (
              <div className="text-center text-xs text-muted-foreground mt-3 pt-3 border-t">
                Showing all {historyLogs.length} transaction record{historyLogs.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
