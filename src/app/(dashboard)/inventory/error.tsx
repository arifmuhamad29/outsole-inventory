"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Inventory Page Error:", error)
  }, [error])

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center space-y-4 text-center">
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
        <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
        <p className="text-muted-foreground max-w-[500px]">
          We encountered an error while loading the inventory data. 
          This could be due to a temporary database connection issue or an invalid search parameter.
        </p>
      </div>
      <Button 
        onClick={() => reset()}
        className="mt-4 gap-2"
        variant="outline"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  )
}
