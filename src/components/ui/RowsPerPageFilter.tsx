"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

export function RowsPerPageFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentLimit = searchParams.get("limit")?.toString() || "48"
  const [value, setValue] = useState(currentLimit)

  useEffect(() => {
    setValue(currentLimit)
  }, [currentLimit])

  const applyLimit = () => {
    const num = parseInt(value)
    if (isNaN(num) || num < 1) {
      setValue(currentLimit)
      return
    }
    
    const params = new URLSearchParams(searchParams.toString())
    if (num.toString() !== "48") {
      params.set("limit", num.toString())
    } else {
      params.delete("limit")
    }
    params.set("page", "1")
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">Tampilkan:</span>
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={applyLimit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            applyLimit()
          }
        }}
        className="w-[80px] h-9 bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 text-center px-2"
        min={1}
      />
      <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">baris</span>
    </div>
  )
}
