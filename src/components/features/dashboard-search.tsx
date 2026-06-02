"use client"

import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState, useTransition, useEffect } from "react"
import { Search } from "lucide-react"

export function DashboardSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  
  const [value, setValue] = useState(searchParams.get("q")?.toString() || "")

  // Sync state if URL changes externally
  useEffect(() => {
    setValue(searchParams.get("q")?.toString() || "")
  }, [searchParams])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setValue(term)
    
    const params = new URLSearchParams(searchParams.toString())
    
    if (term) {
      params.set("q", term)
    } else {
      params.delete("q")
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative max-w-sm w-full mb-4">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search model, article, or QR..."
        className="pl-9 w-full bg-white dark:bg-gray-800"
        value={value}
        onChange={handleSearch}
      />
      {isPending && <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
    </div>
  )
}
