"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function RowsPerPageFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentLimit = searchParams.get("limit")?.toString() || "48"

  const handleLimitChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "48") {
      params.set("limit", value)
    } else {
      params.delete("limit")
    }
    params.set("page", "1")
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">Tampilkan:</span>
      <Select value={currentLimit} onValueChange={handleLimitChange}>
        <SelectTrigger className="w-[80px] bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100">
          <SelectValue placeholder="48" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="16">16</SelectItem>
          <SelectItem value="24">24</SelectItem>
          <SelectItem value="48">48</SelectItem>
          <SelectItem value="96">96</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
