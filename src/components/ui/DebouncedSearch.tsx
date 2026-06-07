"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export function DebouncedSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [term, setTerm] = useState(searchParams.get("search")?.toString() || "")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (term) {
      params.set("search", term)
    } else {
      params.delete("search")
    }
    params.set("page", "1")
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTerm(val)
    if (val === "") {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("search")
      params.set("page", "1")
      router.replace(`${pathname}?${params.toString()}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search model, article, color, size, PO..."
          className="pl-9 w-full bg-white dark:bg-gray-800"
          value={term}
          onChange={handleChange}
        />
      </div>
      <Button type="submit" variant="secondary" className="px-6">
        Cari
      </Button>
    </form>
  )
}
