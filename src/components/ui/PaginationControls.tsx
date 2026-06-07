"use client"

import { useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationControlsProps {
  totalPages: number
  currentPage: number
}

export function PaginationControls({ totalPages, currentPage }: PaginationControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      startTransition(() => {
        router.push(createPageUrl(pageNumber))
      })
    }
  }

  if (totalPages <= 1) return null

  // Generate page numbers logic
  const pageNumbers: (number | string)[] = []
  const maxVisiblePages = 5

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    // Always show page 1
    pageNumbers.push(1)

    // Calculate start and end indices for pages between first and last
    let start = Math.max(2, currentPage - 1)
    let end = Math.min(totalPages - 1, currentPage + 1)

    // Adjust if current page is near boundaries
    if (currentPage <= 2) {
      end = 4
    } else if (currentPage >= totalPages - 1) {
      start = totalPages - 3
    }

    if (start > 2) {
      pageNumbers.push("ellipsis-1")
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i)
    }

    if (end < totalPages - 1) {
      pageNumbers.push("ellipsis-2")
    }

    // Always show last page
    pageNumbers.push(totalPages)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 rounded-b-lg print:hidden">
      <div className="text-sm text-muted-foreground order-2 sm:order-1">
        Showing page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={isPending || currentPage <= 1}
          className="h-8 px-3 select-none"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (typeof page === "string") {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground text-sm select-none">
                  ...
                </span>
              )
            }

            return (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handlePageChange(page)}
                disabled={isPending}
              >
                {page}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={isPending || currentPage >= totalPages}
          className="h-8 px-3 select-none"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
