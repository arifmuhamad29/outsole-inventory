"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { hardDeleteOutsoleAction } from "@/app/actions/inventory"
import { PrintableLabel } from "@/components/ui/printable-label"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Printer, Trash2 } from "lucide-react"

export function DashboardActions({ item, isAdmin }: { 
  item: { id: string, qrCode: string, model: string, article: string, color: string, size: string, createdAt?: Date | string }, 
  isAdmin: boolean 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null)
  
  const [isPrintOpen, setIsPrintOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      setIsOpen(open)
      if (!open) {
        setPassword("")
        setMessage(null)
      }
    }
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || isDeleting) return

    setIsDeleting(true)
    setMessage(null)
    
    const res = await hardDeleteOutsoleAction(item.id, password)
    
    if (res.success) {
      setMessage({ text: "Permanently deleted", type: "success" })
      setIsOpen(false)
      setPassword("")
    } else {
      setMessage({ text: res.message, type: "error" })
    }
    
    setIsDeleting(false)
  }

  return (
    <>
      <div className="flex items-center gap-2 print:hidden">
      {message && !isOpen && (
        <span className={`text-xs ${message.type === "error" ? "text-red-500" : "text-green-600"}`}>
          {message.text}
        </span>
      )}

      {/* Print QR Dialog */}
      <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
        <DialogTrigger render={
          <Button variant="outline" size="sm" title="Print QR">
            <Printer className="h-4 w-4" />
          </Button>
        } />
        <DialogContent className="sm:max-w-[400px] print:hidden">
          <DialogHeader>
            <DialogTitle>Print QR Code</DialogTitle>
          </DialogHeader>
          {/* We keep a preview here but it won't be printed */}
          <div className="p-4 border rounded-md">
            <PrintableLabel 
              qrCode={item.qrCode} 
              model={item.model} 
              article={item.article} 
              color={item.color} 
              size={item.size} 
              createdAt={item.createdAt}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => window.print()}>
              Print Label
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hard Delete (Admins only) */}
      {isAdmin && (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger render={<Button variant="destructive" size="icon" title="Delete Item" disabled={isDeleting} />}>
            {isDeleting ? "..." : <Trash2 className="h-4 w-4" />}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form onSubmit={handleDelete}>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanent Deletion Warning</AlertDialogTitle>
                <AlertDialogDescription className="text-red-600 font-medium">
                  WARNING: This will permanently erase this model and all its associated records (transactions, opname items). This action cannot be undone. Are you sure?
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="py-4 space-y-2">
                <Input 
                  type="password" 
                  placeholder="Enter Admin Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isDeleting}
                  required
                />
                {message && message.type === "error" && (
                  <p className="text-sm text-red-500 font-medium">{message.text}</p>
                )}
              </div>
              
              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={isDeleting} onClick={() => setIsOpen(false)}>
                  Cancel
                </AlertDialogCancel>
                <Button 
                  type="submit" 
                  variant="destructive"
                  disabled={!password || isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      )}
      </div>

      {/* Actual printable content rendered via Portal directly into body to prevent any layout interference */}
      {isPrintOpen && mounted && createPortal(
        <div className="print-container hidden print:flex flex-col items-center justify-start w-full absolute top-0 left-0 bg-white z-[9999]">
          <PrintableLabel 
            qrCode={item.qrCode} 
            model={item.model} 
            article={item.article} 
            color={item.color} 
            size={item.size} 
            createdAt={item.createdAt}
          />
        </div>,
        document.body
      )}
    </>
  )
}
