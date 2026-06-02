"use client"

import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState, useTransition, useEffect } from "react"
import { Search } from "lucide-react"
import { useDebounce } from "use-debounce"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function DashboardSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  
  const initialSearch = searchParams.get("q")?.toString() || ""
  const initialStatus = searchParams.get("status")?.toString() || "all"

  const [search, setSearch] = useState(initialSearch)
  const [debouncedSearch] = useDebounce(search, 500)
  
  const [status, setStatus] = useState(initialStatus)

  // Sync state if URL changes externally
  useEffect(() => {
    setSearch(searchParams.get("q")?.toString() || "")
    setStatus(searchParams.get("status")?.toString() || "all")
  }, [searchParams])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    let hasChanges = false
    
    if (debouncedSearch) {
      if (params.get("q") !== debouncedSearch) {
        params.set("q", debouncedSearch)
        hasChanges = true
      }
    } else {
      if (params.has("q")) {
        params.delete("q")
        hasChanges = true
      }
    }

    if (status && status !== "all") {
      if (params.get("status") !== status) {
        params.set("status", status)
        hasChanges = true
      }
    } else {
      if (params.has("status")) {
        params.delete("status")
        hasChanges = true
      }
    }

    if (hasChanges) {
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    }
  }, [debouncedSearch, status, pathname, router, searchParams])

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search model, article, or QR..."
          className="pl-9 w-full bg-white dark:bg-gray-800"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isPending && <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
      </div>
      <Select value={status} onValueChange={(val) => setStatus(val || "all")}>
        <SelectTrigger className="w-full sm:w-[140px] bg-white dark:bg-gray-800">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="instock">In Stock</SelectItem>
          <SelectItem value="lowstock">Low Stock</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
