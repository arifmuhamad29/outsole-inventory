"use client"

import { useEffect, useState } from "react"
import { getToolingModels } from "@/app/actions/tooling-fetch" // We'll need this fetcher
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { FileCheck, Wrench, Loader2 } from "lucide-react"
import { ToolingDrawer } from "@/components/tooling/tooling-drawer"
import { ShoeModel, ToolingItem, ToolingPhase } from "@prisma/client"

type ShoeModelWithTooling = ShoeModel & {
  toolingItems: (ToolingItem & {
    phases: ToolingPhase[]
  })[]
}

export default function ToolingPage() {
  const [models, setModels] = useState<ShoeModelWithTooling[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<ShoeModelWithTooling | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Fetch data
  const fetchData = async () => {
    try {
      // Create this action in the next step
      const data = await getToolingModels()
      setModels(data)
    } catch (error) {
      console.error("Failed to load tooling models", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // When drawer closes, refresh data to get latest statuses
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    fetchData()
  }

  const openDrawer = (model: ShoeModelWithTooling) => {
    setSelectedModel(model)
    setIsDrawerOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="w-8 h-8" />
            Tooling Tracking (MES)
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor readiness of Bottom Tooling and Assembly Tooling across all phases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => {
          // Calculate Readiness
          let totalPhases = 0
          let readyPhases = 0

          model.toolingItems.forEach((item: ToolingItem & { phases: ToolingPhase[] }) => {
            item.phases.forEach((phase: ToolingPhase) => {
              if (phase.status !== "NOT USE") {
                totalPhases++
                if (phase.status === "VERIFIED" || phase.status === "EXISTING") {
                  readyPhases++
                }
              }
            })
          })

          const progressPercentage = totalPhases > 0 ? Math.round((readyPhases / totalPhases) * 100) : 0

          return (
            <Card key={model.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">{model.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Overall Readiness</span>
                    <span className="font-bold text-primary">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {readyPhases} of {totalPhases} active phases verified
                  </p>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={() => openDrawer(model)}
                >
                  <FileCheck className="w-4 h-4" />
                  Lihat Detail Checklist
                </Button>
              </CardFooter>
            </Card>
          )
        })}
        {models.length === 0 && (
          <div className="col-span-full p-8 text-center border rounded-lg bg-slate-50 text-slate-500">
            No tooling models found. Add data to begin tracking.
          </div>
        )}
      </div>

      <ToolingDrawer 
        model={selectedModel} 
        isOpen={isDrawerOpen} 
        onClose={handleCloseDrawer} 
      />
    </div>
  )
}
