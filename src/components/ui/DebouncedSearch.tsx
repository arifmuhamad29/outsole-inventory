"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, QrCode } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CameraScanner } from "@/components/features/camera-scanner"

export function DebouncedSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [term, setTerm] = useState(searchParams.get("search")?.toString() || "")
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    executeSearch(term)
  }

  const executeSearch = (searchTerm: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchTerm) {
      params.set("search", searchTerm)
    } else {
      params.delete("search")
    }
    params.set("page", "1")
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTerm(val)
    if (val === "") {
      executeSearch("")
    }
  }

  const handleScanSuccess = (decodedText: string) => {
    setTerm(decodedText)
    setIsScannerOpen(false)
    executeSearch(decodedText)
  }

  return (
    <>
      <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search model, article, color, size, PO..."
            className="pl-9 pr-10 w-full bg-white dark:bg-gray-800"
            value={term}
            onChange={handleChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 h-full px-3 text-muted-foreground hover:text-primary hover:bg-transparent"
            onClick={() => setIsScannerOpen(true)}
            title="Scan QR/Barcode"
          >
            <QrCode className="h-5 w-5" />
          </Button>
        </div>
        <Button type="submit" variant="secondary" className="px-6" disabled={isPending}>
          {isPending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            "Search"
          )}
        </Button>
      </form>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR / Barcode</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <CameraScanner onScanSuccess={handleScanSuccess} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
