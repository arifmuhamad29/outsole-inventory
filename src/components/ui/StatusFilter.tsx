"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function StatusFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get("status")?.toString() || "all"

  const handleStatusChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set("status", value)
    } else {
      params.delete("status")
    }
    params.set("page", "1")
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={currentStatus} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-full sm:w-[150px] bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="instock">In Stock</SelectItem>
        <SelectItem value="lowstock">Low Stock</SelectItem>
      </SelectContent>
    </Select>
  )
}
