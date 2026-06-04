"use client"

import { useState, Fragment, useEffect } from "react"
import { getToolingModels } from "@/app/actions/tooling-fetch"
import { format, isBefore, startOfDay } from "date-fns"
import { Search, Loader2, ListChecks, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Simplified Types
type Phase = {
  id: string
  phaseType: string
  qty: string | null
  orderDate: Date | null
  targetETA: Date | null
  actualETA: Date | null
  status: string
}

type Item = {
  id: string
  category: string
  name: string
  remark: string | null
  phases: Phase[]
}

type ShoeModelWithTooling = {
  id: string
  name: string
  lastUpdated: Date
  toolingItems: Item[]
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "EXISTING":
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">EXISTING</Badge>
    case "VERIFIED":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">VERIFIED</Badge>
    case "ON PROCESS":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">ON PROCESS</Badge>
    case "NOT USE":
      return <Badge variant="outline" className="bg-slate-100 text-slate-400 border-slate-200">NOT USE</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const formatDateForDisplay = (date: Date | null | string) => {
  if (!date) return "-"
  return format(new Date(date), "dd MMM yyyy")
}

// Read Only Drawer Component
function PublicToolingDrawer({ model, isOpen, onClose }: { model: ShoeModelWithTooling | null, isOpen: boolean, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("FSR")

  if (!model || !isOpen) return null

  const renderTable = (category: string, phaseType: string) => {
    const items = model.toolingItems.filter((i) => i.category === category)
    const today = startOfDay(new Date())

    return (
      <div className="mb-6">
        <h3 className="font-semibold text-base mb-2">{category}</h3>
        <div className="rounded-md border bg-white overflow-x-auto shadow-sm">
          <Table className="text-xs sm:text-sm">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[200px]">Tooling Name</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Target ETA</TableHead>
                <TableHead>Actual ETA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-6">
                    Belum ada data untuk kategori ini.
                  </TableCell>
                </TableRow>
              ) : items.map((item) => {
                const phase = item.phases.find((p) => p.phaseType === phaseType)
                if (!phase) return null

                const isOverdue =
                  phase.status === "ON PROCESS" &&
                  phase.targetETA &&
                  isBefore(startOfDay(new Date(phase.targetETA)), today)

                return (
                  <TableRow key={item.id} className={isOverdue ? "bg-red-50/50" : ""}>
                    <TableCell className="font-medium min-w-[200px]">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-slate-600">{phase.qty || "-"}</TableCell>
                    <TableCell className="text-slate-600">{formatDateForDisplay(phase.orderDate)}</TableCell>
                    <TableCell className={`text-slate-600 font-medium ${isOverdue ? "text-red-600" : ""}`}>
                      {formatDateForDisplay(phase.targetETA)}
                    </TableCell>
                    <TableCell className="text-slate-600">{formatDateForDisplay(phase.actualETA)}</TableCell>
                    <TableCell>
                      <StatusBadge status={phase.status} />
                    </TableCell>
                    <TableCell className="text-slate-600 max-w-[200px] truncate" title={item.remark || ""}>
                      {item.remark || "-"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-slate-50 shadow-inner p-6 flex flex-col border-b border-gray-200">
      <div className="flex items-center justify-between mb-6 pb-2 border-b">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 uppercase">
            Detail Checklist: {model.name}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Last updated: {format(new Date(model.lastUpdated), "dd MMM yyyy, HH:mm")}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-5 h-5 text-slate-500" />
        </Button>
      </div>

      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="SAMPLE">Sample</TabsTrigger>
            <TabsTrigger value="EXTREME">Extreme</TabsTrigger>
            <TabsTrigger value="FSR">FSR</TabsTrigger>
          </TabsList>

          <TabsContent value="SAMPLE" className="mt-0">
            {renderTable("BOTTOM TOOLING", "SAMPLE")}
            {renderTable("ASSEMBLY TOOLING", "SAMPLE")}
          </TabsContent>

          <TabsContent value="EXTREME" className="mt-0">
            {renderTable("BOTTOM TOOLING", "EXTREME")}
            {renderTable("ASSEMBLY TOOLING", "EXTREME")}
          </TabsContent>

          <TabsContent value="FSR" className="mt-0">
            {renderTable("BOTTOM TOOLING", "FSR")}
            {renderTable("ASSEMBLY TOOLING", "FSR")}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Main View Component
export function PublicToolingView() {
  const [models, setModels] = useState<ShoeModelWithTooling[]>([])
  const [filteredModels, setFilteredModels] = useState<ShoeModelWithTooling[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<ShoeModelWithTooling | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getToolingModels()
        setModels(data as ShoeModelWithTooling[])
        setFilteredModels(data as ShoeModelWithTooling[])
      } catch (error) {
        console.error("Failed to load tooling models", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredModels(models)
    } else {
      const lowerQuery = searchQuery.toLowerCase()
      setFilteredModels(models.filter(m => m.name.toLowerCase().includes(lowerQuery)))
    }
  }, [searchQuery, models])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari model sepatu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Showing {filteredModels.length} Models
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-700">Shoe Model Name</TableHead>
                <TableHead className="font-semibold text-slate-700">Total Tools</TableHead>
                <TableHead className="font-semibold text-slate-700">Readiness</TableHead>
                <TableHead className="font-semibold text-slate-700">Last Updated</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    Tidak ditemukan model &quot;{searchQuery}&quot;
                  </TableCell>
                </TableRow>
              ) : (
                filteredModels.map((model) => {
                  let totalPhases = 0
                  let readyPhases = 0

                  model.toolingItems.forEach((item) => {
                    item.phases.forEach((phase) => {
                      if (phase.status !== "NOT USE") {
                        totalPhases++
                        if (phase.status === "VERIFIED" || phase.status === "EXISTING") {
                          readyPhases++
                        }
                      }
                    })
                  })

                  const progress = totalPhases > 0 ? Math.round((readyPhases / totalPhases) * 100) : 0
                  
                  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary"
                  if (progress === 100) badgeVariant = "default"
                  else if (progress > 50) badgeVariant = "outline"
                  else if (totalPhases > 0) badgeVariant = "destructive"

                  const isExpanded = isDrawerOpen && selectedModel?.id === model.id

                  return (
                    <Fragment key={model.id}>
                      <TableRow className={`transition-colors ${isExpanded ? "bg-slate-50/80" : "hover:bg-slate-50/50"}`}>
                        <TableCell className="font-medium text-base text-slate-900 uppercase">
                          {model.name}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {model.toolingItems.length} Items <span className="text-xs text-slate-400">({totalPhases} Active Phases)</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant} className="px-2 py-1">
                            {progress}% Ready
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {format(new Date(model.lastUpdated), "dd MMM yyyy, HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (isExpanded) {
                                setIsDrawerOpen(false)
                                setSelectedModel(null)
                              } else {
                                setSelectedModel(model)
                                setIsDrawerOpen(true)
                              }
                            }}
                            className={`gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 ${isExpanded ? "bg-slate-200" : ""}`}
                          >
                            <ListChecks className="w-4 h-4" />
                            {isExpanded ? "Tutup" : "Lihat Checklist"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && (
                        <TableRow className="bg-slate-50/30">
                          <TableCell colSpan={5} className="p-0 border-b">
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300 ease-out">
                              <PublicToolingDrawer 
                                model={selectedModel} 
                                isOpen={true} 
                                onClose={() => {
                                  setIsDrawerOpen(false)
                                  setSelectedModel(null)
                                }} 
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
