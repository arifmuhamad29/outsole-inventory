"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function RowsPerPageFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentLimit = searchParams.get("limit")?.toString() || "48"
  const [value, setValue] = useState(currentLimit)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setValue(currentLimit)
  }, [currentLimit])

  const applyLimit = () => {
    const num = parseInt(value)
    if (isNaN(num) || num < 1) {
      setValue(currentLimit)
      return
    }
    
    // Only apply if the value changed
    if (num.toString() === currentLimit) {
      return
    }
    
    const params = new URLSearchParams(searchParams.toString())
    if (num.toString() !== "48") {
      params.set("limit", num.toString())
    } else {
      params.delete("limit")
    }
    params.set("page", "1")
    
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">Tampilkan:</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              applyLimit()
            }
          }}
          className="w-[70px] h-9 bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 text-center px-2"
          min={1}
          disabled={isPending}
        />
        {!isPending ? (
          <Button 
            size="sm" 
            variant="default" 
            className="h-9 px-3 font-semibold text-xs" 
            onClick={applyLimit}
            disabled={value === currentLimit}
          >
            OK
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="default" 
            className="h-9 px-3"
            disabled
          >
            <Loader2 className="w-4 h-4 animate-spin" />
          </Button>
        )}
      </div>
      <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">baris</span>
    </div>
  )
}
