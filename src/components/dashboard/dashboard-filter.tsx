"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Filter, X } from "lucide-react"

export function DashboardFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [from, setFrom] = useState(searchParams.get("from") || "")
  const [to, setTo] = useState(searchParams.get("to") || "")

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (from) params.set("from", from)
    else params.delete("from")
    
    if (to) params.set("to", to)
    else params.delete("to")
    
    router.push(`/?${params.toString()}`)
  }

  const handleReset = () => {
    setFrom("")
    setTo("")
    router.push("/")
  }

  const hasFilter = searchParams.has("from") || searchParams.has("to")

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <Input 
          type="date" 
          value={from} 
          onChange={(e) => setFrom(e.target.value)} 
          className="w-[130px] h-9 text-xs sm:text-sm"
        />
        <span className="text-sm text-muted-foreground">-</span>
        <Input 
          type="date" 
          value={to} 
          onChange={(e) => setTo(e.target.value)} 
          className="w-[130px] h-9 text-xs sm:text-sm"
        />
      </div>
      <Button variant="secondary" size="sm" onClick={handleApply} className="h-9">
        <Filter className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Filter</span>
      </Button>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 text-muted-foreground hover:text-red-600">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
