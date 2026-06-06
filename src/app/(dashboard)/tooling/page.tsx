"use client"

import { useEffect, useState, useTransition, Fragment } from "react"
import { useSession } from "next-auth/react"
import { getToolingModels } from "@/app/actions/tooling-fetch"
import { createShoeModelAction, deleteShoeModelAction } from "@/app/actions/tooling"
import { ShoeModel, ToolingItem, ToolingPhase } from "@prisma/client"
import { format } from "date-fns"
import { Wrench, Loader2, ListChecks, Search, Plus, Trash2 } from "lucide-react"
import { ToolingDrawer } from "@/components/tooling/tooling-drawer"
import { CsvImporter } from "@/components/tooling/csv-importer"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ShoeModelWithTooling = ShoeModel & {
  toolingItems: (ToolingItem & {
    phases: ToolingPhase[]
  })[]
}

export default function ToolingPage() {
  const { data: session } = useSession()
  const canEdit = session?.user?.permissions?.includes("EDIT_TOOLING_MES") || session?.user?.role === "SUPER_ADMIN"
  const [models, setModels] = useState<ShoeModelWithTooling[]>([])
  const [filteredModels, setFilteredModels] = useState<ShoeModelWithTooling[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<ShoeModelWithTooling | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  const [isPending, startTransition] = useTransition()
  const [newModelName, setNewModelName] = useState("")
  const [isNewModelDialogOpen, setIsNewModelDialogOpen] = useState(false)
  const [modelToDelete, setModelToDelete] = useState<string | null>(null)

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

  useEffect(() => {
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

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedModel(null)
    fetchData() // Refresh after saving
  }

  const openDrawer = (model: ShoeModelWithTooling) => {
    setSelectedModel(model)
    setIsDrawerOpen(true)
  }

  const handleCreateModel = () => {
    startTransition(async () => {
      const res = await createShoeModelAction(newModelName)
      if (res.success) {
        setIsNewModelDialogOpen(false)
        setNewModelName("")
        fetchData()
      } else {
        alert(res.message)
      }
    })
  }

  const handleDeleteModel = () => {
    if (!modelToDelete) return
    startTransition(async () => {
      const res = await deleteShoeModelAction(modelToDelete)
      if (res.success) {
        if (selectedModel?.id === modelToDelete) setIsDrawerOpen(false)
        setModelToDelete(null)
        fetchData()
      } else {
        alert(res.message)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="w-8 h-8" />
            Tooling Tracking (MES)
          </h1>
          <p className="text-muted-foreground mt-1">
            Master Data for Bottom and Assembly Tooling.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search shoe model..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white"
            />
          </div>
          {canEdit && (
            <>
              <CsvImporter onSuccess={fetchData} />
              <Dialog open={isNewModelDialogOpen} onOpenChange={setIsNewModelDialogOpen}>
                <DialogTrigger render={<Button className="gap-2 shadow-sm" />}>
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Model
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Model Sepatu Baru</DialogTitle>
                    <DialogDescription>
                      Model baru ini akan otomatis diisi dengan 10 baris tooling bawaan beserta 2 fasenya (Extreme, FSR).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Input 
                      placeholder="NAMA MODEL SEPATU..." 
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value.toUpperCase())}
                      disabled={isPending}
                      className="h-10 uppercase"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewModelDialogOpen(false)} disabled={isPending}>Batal</Button>
                    <Button onClick={handleCreateModel} disabled={isPending || !newModelName.trim()}>
                      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Buat Model
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-md border bg-white shadow-sm">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-end">
          <div className="text-sm text-slate-500 font-medium">
            Showing {filteredModels.length} Models
          </div>
        </div>
        <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-700">Shoe Model Name</TableHead>
                <TableHead className="font-semibold text-slate-700">Total Tools</TableHead>
                <TableHead className="font-semibold text-slate-700">Readiness</TableHead>
                <TableHead className="font-semibold text-slate-700">Last Updated</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    No models found matching &quot;{searchQuery}&quot;
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
                  if (progress === 100) badgeVariant = "default" // or a custom green one
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
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => isExpanded ? handleCloseDrawer() : openDrawer(model)}
                              className={`gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 ${isExpanded ? "bg-slate-200" : ""}`}
                            >
                              <ListChecks className="w-4 h-4" />
                              {isExpanded ? "Tutup Checklist" : (canEdit ? "Kelola Checklist" : "Lihat Checklist")}
                            </Button>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setModelToDelete(model.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                                disabled={isPending}
                                title="Hapus Model"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Accordion Row */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/30">
                          <TableCell colSpan={5} className="p-0 border-b">
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300 ease-out">
                              <ToolingDrawer 
                                model={selectedModel} 
                                isOpen={true} 
                                onClose={handleCloseDrawer} 
                                isReadOnly={!canEdit}
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
      <AlertDialog open={!!modelToDelete} onOpenChange={(open) => !open && setModelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Model Sepatu?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Model sepatu beserta seluruh 
              data checklist tooling di dalamnya akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteModel}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500 text-white"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
