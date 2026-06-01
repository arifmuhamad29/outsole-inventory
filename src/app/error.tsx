"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-red-600">Something went wrong!</h2>
      <p className="text-muted-foreground max-w-md">
        An unexpected error occurred. Please try again or contact support if the issue persists.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}
