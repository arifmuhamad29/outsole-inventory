"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteStockOpnameSessionAction } from "@/app/actions/opname"
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

export function OpnameSessionActions({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null)

  if (!isAdmin) return null

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
    
    const res = await deleteStockOpnameSessionAction(id, password)
    
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
    <div className="flex items-center gap-2">
      {message && !isOpen && (
        <span className={`text-xs ${message.type === "error" ? "text-red-500" : "text-green-600"}`}>
          {message.text}
        </span>
      )}

      <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger render={<Button variant="destructive" size="sm" disabled={isDeleting} />}>
          {isDeleting ? "..." : "Delete"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <form onSubmit={handleDelete}>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanent Deletion Warning</AlertDialogTitle>
              <AlertDialogDescription className="text-red-600 font-medium">
                WARNING: This will permanently erase this Opname Session and all its scanned items. This action cannot be undone. Are you sure?
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
    </div>
  )
}
