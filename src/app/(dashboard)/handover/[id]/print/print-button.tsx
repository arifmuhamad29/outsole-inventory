"use client"

import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function PrintButton() {
  const router = useRouter()
  
  useEffect(() => {
    // Automatically open print dialog after a short delay to ensure rendering is complete
    const timer = setTimeout(() => {
      window.print()
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="sm" className="gap-2 bg-white text-black hover:bg-gray-100" onClick={() => window.print()}>
        <Printer className="w-4 h-4" />
        Cetak Ulang
      </Button>
      <Button variant="ghost" size="sm" className="gap-2 text-gray-500 hover:text-black" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Button>
    </div>
  )
}
