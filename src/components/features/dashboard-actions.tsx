"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { hardDeleteOutsoleAction } from "@/app/actions/inventory"
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
import { QRCodeSVG } from "qrcode.react"
import { Badge } from "@/components/ui/badge"
import { Printer } from "lucide-react"

export function DashboardActions({ item, isAdmin }: { 
  item: { id: string, qrCode: string, model: string, article: string, color: string, size: string }, 
  isAdmin: boolean 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null)
  
  const [isPrintOpen, setIsPrintOpen] = useState(false)

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
        <DialogContent className="sm:max-w-[400px] print:w-full print:max-w-none print:h-screen print:border-none print:shadow-none print:m-0 print:p-0 print:absolute print:inset-0 print:flex print:flex-col print:items-center print:justify-center print:bg-white print:rounded-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Print QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border-dashed border-2 rounded-lg print:border-none print:bg-white print:m-0">
            <div className="p-4 bg-white rounded-xl shadow-sm border print:border-none print:shadow-none print:p-0 mb-6 print:mb-4">
              <QRCodeSVG value={item.qrCode} size={200} />
            </div>
            <div className="text-center space-y-2 w-full">
              <div>
                <Badge variant="outline" className="text-lg px-4 py-1 font-mono tracking-widest print:border-black print:text-black">{item.qrCode}</Badge>
              </div>
              <div className="text-sm text-gray-700 space-y-1 print:text-black">
                <p>Model: <strong>{item.model}</strong></p>
                <p>Article: <strong>{item.article}</strong></p>
                <p>Color: <strong>{item.color}</strong></p>
                <p>Size: <strong>{item.size}</strong></p>
              </div>
            </div>
          </div>
          <div className="flex justify-end print:hidden">
            <Button onClick={() => window.print()}>
              Print Label
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hard Delete (Admins only) */}
      {isAdmin && (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger render={<Button variant="destructive" size="sm" disabled={isDeleting} />}>
            {isDeleting ? "..." : "Delete"}
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
  )
}
