"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createOpnameSessionAction } from "@/app/actions/opname"
import { Loader2 } from "lucide-react"

export function OpnameCreateSessionForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    try {
      const res = await createOpnameSessionAction(formData)
      if (res.success && res.sessionId) {
        router.push(`/opname/${res.sessionId}`)
      } else {
        alert(res.message || "Failed to create session")
        setIsLoading(false)
      }
    } catch (error) {
      console.error(error)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input 
        type="text" 
        name="name" 
        placeholder="Session Name (e.g. Q1 2026)" 
        required 
        disabled={isLoading}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
        Start New Session
      </Button>
    </form>
  )
}
