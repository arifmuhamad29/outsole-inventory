"use client"

import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState, useTransition, useEffect } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const [status, setStatus] = useState(initialStatus)

  // Sync state if URL changes externally
  useEffect(() => {
    setSearch(searchParams.get("q")?.toString() || "")
    setStatus(searchParams.get("status")?.toString() || "all")
  }, [searchParams])

  const executeSearch = (searchTerm: string, currentStatus: string) => {
    const params = new URLSearchParams(searchParams.toString())
    let hasChanges = false
    
    if (searchTerm) {
      if (params.get("q") !== searchTerm) {
        params.set("q", searchTerm)
        hasChanges = true
      }
    } else {
      if (params.has("q")) {
        params.delete("q")
        hasChanges = true
      }
    }

    if (currentStatus && currentStatus !== "all") {
      if (params.get("status") !== currentStatus) {
        params.set("status", currentStatus)
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
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeSearch(search, status)
  }

  const onStatusChange = (val: string | null) => {
    const newVal = val || "all"
    setStatus(newVal)
    executeSearch(search, newVal)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-xl mb-4">
      <div className="relative flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search model, article, or QR..."
            className="pl-9 w-full bg-white dark:bg-gray-800"
            value={search}
            onChange={(e) => {
              const val = e.target.value
              setSearch(val)
              if (val === "") {
                executeSearch("", status)
              }
            }}
          />
        </div>
        <Button type="submit" disabled={isPending} variant="secondary">
          {isPending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            "Search"
          )}
        </Button>
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[140px] bg-white dark:bg-gray-800">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="instock">In Stock</SelectItem>
          <SelectItem value="lowstock">Low Stock</SelectItem>
        </SelectContent>
      </Select>
    </form>
  )
}
