"use client"

import { useState, useTransition, useEffect } from "react"
import { format, isBefore, startOfDay } from "date-fns"
import { updateModelToolingAction } from "@/app/actions/tooling"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Save, X, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"

// Types
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

interface ToolingDrawerProps {
  model: ShoeModelWithTooling | null
  isOpen: boolean
  onClose: () => void
  isReadOnly?: boolean
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

// Helper to format Date to YYYY-MM-DD for Input type="date"
const formatDateForInput = (date: Date | null) => {
  if (!date) return ""
  return format(new Date(date), "yyyy-MM-dd")
}

const formatDateForDisplay = (date: Date | null | string) => {
  if (!date) return "-"
  return format(new Date(date), "dd MMM yyyy")
}

export function ToolingDrawer({ model, isOpen, onClose, isReadOnly = false }: ToolingDrawerProps) {
  const [activeTab, setActiveTab] = useState("FSR")
  const [isPending, startTransition] = useTransition()
  
  // Form State
  const [phaseData, setPhaseData] = useState<Record<string, { qty: string, orderDate: string, targetETA: string, actualETA: string, status: string }>>({})
  const [itemRemarks, setItemRemarks] = useState<Record<string, string>>({})
  const [itemNames, setItemNames] = useState<Record<string, string>>({})
  const [newItemsList, setNewItemsList] = useState<Item[]>([])
  const [deletedItemsList, setDeletedItemsList] = useState<string[]>([])
  const [orderedItemIds, setOrderedItemIds] = useState<Record<string, string[]>>({
    "BOTTOM TOOLING": [],
    "ASSEMBLY TOOLING": []
  })

  // Initialize state when model changes
  useEffect(() => {
    if (model) {
      const newPhaseData: typeof phaseData = {}
      const newItemRemarks: typeof itemRemarks = {}
      const newItemNames: typeof itemNames = {}
      
      model.toolingItems.forEach(item => {
        newItemRemarks[item.id] = item.remark || ""
        newItemNames[item.id] = item.name || ""
        item.phases.forEach(phase => {
          newPhaseData[phase.id] = {
            qty: phase.qty || "",
            orderDate: formatDateForInput(phase.orderDate),
            targetETA: formatDateForInput(phase.targetETA),
            actualETA: formatDateForInput(phase.actualETA),
            status: phase.status,
          }
        })
      })
      
      setPhaseData(newPhaseData)
      setItemRemarks(newItemRemarks)
      setItemNames(newItemNames)
      setNewItemsList([]) // reset new items
      setDeletedItemsList([]) // reset deleted items

      const bottomIds = model.toolingItems.filter(i => i.category === "BOTTOM TOOLING").map(i => i.id)
      const assemblyIds = model.toolingItems.filter(i => i.category === "ASSEMBLY TOOLING").map(i => i.id)
      setOrderedItemIds({
        "BOTTOM TOOLING": bottomIds,
        "ASSEMBLY TOOLING": assemblyIds
      })
    }
  }, [model])

  if (!model || !isOpen) return null

  const handleAddNewItem = (category: string) => {
    const newItemId = `new-item-${Date.now()}`
    const newPhases = ["EXTREME", "FSR"].map(pt => ({
      id: `new-phase-${pt}-${Date.now()}`,
      phaseType: pt,
      qty: null, orderDate: null, targetETA: null, actualETA: null, status: "ON PROCESS"
    }))
    
    const newItem: Item = {
      id: newItemId,
      category,
      name: "",
      remark: null,
      phases: newPhases as Phase[]
    }

    setNewItemsList(prev => [...prev, newItem])
    
    setOrderedItemIds(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), newItemId]
    }))
    
    setItemNames(prev => ({ ...prev, [newItemId]: "" }))
    setItemRemarks(prev => ({ ...prev, [newItemId]: "" }))
    
    const newPhaseState: Record<string, { qty: string, orderDate: string, targetETA: string, actualETA: string, status: string }> = {}
    newPhases.forEach(p => {
      newPhaseState[p.id] = {
        qty: "", orderDate: "", targetETA: "", actualETA: "", status: "ON PROCESS"
      }
    })
    
    setPhaseData(prev => ({ ...prev, ...newPhaseState }))
  }

  const handlePhaseChange = (phaseId: string, field: string, value: string) => {
    setPhaseData(prev => ({
      ...prev,
      [phaseId]: {
        ...prev[phaseId],
        [field]: value
      }
    }))
  }

  const handleRemarkChange = (itemId: string, value: string) => {
    setItemRemarks(prev => ({
      ...prev,
      [itemId]: value
    }))
  }

  const handleItemNameChange = (itemId: string, value: string) => {
    setItemNames(prev => ({
      ...prev,
      [itemId]: value
    }))
  }

  const handleDeleteItem = (itemId: string) => {
    if (itemId.startsWith("new-item-")) {
      setNewItemsList(prev => prev.filter(i => i.id !== itemId))
    } else {
      setDeletedItemsList(prev => [...prev, itemId])
    }
    setOrderedItemIds(prev => {
      const newMap = { ...prev }
      Object.keys(newMap).forEach(cat => {
        newMap[cat] = newMap[cat].filter(id => id !== itemId)
      })
      return newMap
    })
  }

  const handleMoveItem = (category: string, index: number, direction: 'up' | 'down') => {
    setOrderedItemIds(prev => {
      const arr = [...(prev[category] || [])]
      if (direction === 'up' && index > 0) {
        const temp = arr[index]
        arr[index] = arr[index - 1]
        arr[index - 1] = temp
      } else if (direction === 'down' && index < arr.length - 1) {
        const temp = arr[index]
        arr[index] = arr[index + 1]
        arr[index + 1] = temp
      }
      return { ...prev, [category]: arr }
    })
  }

  const handleSave = () => {
    if (!model) return

    const payload = {
      phases: Object.entries(phaseData)
        .filter(([id]) => !id.startsWith("new-phase-"))
        .map(([id, data]) => ({
          id,
          qty: data.qty || null,
          orderDate: data.orderDate || null,
          targetETA: data.targetETA || null,
          actualETA: data.actualETA || null,
          status: data.status,
        })),
      items: Object.entries(itemRemarks)
        .filter(([id]) => !id.startsWith("new-item-"))
        .map(([id, remark]) => {
          let sortOrder = 0;
          for (const ids of Object.values(orderedItemIds)) {
            const idx = ids.indexOf(id)
            if (idx !== -1) sortOrder = idx
          }
          return {
            id,
            name: itemNames[id] || "",
            remark: remark || null,
            sortOrder,
          }
        }),
      newItems: newItemsList.map(ni => {
        let sortOrder = 0;
        for (const ids of Object.values(orderedItemIds)) {
          const idx = ids.indexOf(ni.id)
          if (idx !== -1) sortOrder = idx
        }
        return {
          category: ni.category,
          name: itemNames[ni.id] || "",
          remark: itemRemarks[ni.id] || null,
          sortOrder,
          phases: ni.phases.map(p => ({
          phaseType: p.phaseType,
          qty: phaseData[p.id]?.qty || null,
          orderDate: phaseData[p.id]?.orderDate || null,
          targetETA: phaseData[p.id]?.targetETA || null,
          actualETA: phaseData[p.id]?.actualETA || null,
          status: phaseData[p.id]?.status || "ON PROCESS",
        }))
        }
      }),
      deletedItemIds: deletedItemsList
    }

    startTransition(async () => {
      const res = await updateModelToolingAction(model.id, payload)
      if (res.success) {
        onClose() 
      } else {
        alert(res.message)
      }
    })
  }

  const renderTable = (category: string, phaseType: string) => {
    const combinedItems = [...model.toolingItems, ...newItemsList]
    const currentOrderedIds = orderedItemIds[category] || []
    const items = currentOrderedIds
      .filter(id => !deletedItemsList.includes(id))
      .map(id => combinedItems.find(i => i.id === id))
      .filter((i): i is Item => i !== undefined)

    const today = startOfDay(new Date())

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-base">{category}</h3>
          {!isReadOnly && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleAddNewItem(category)}
              className="h-8 gap-1 text-xs text-slate-600"
            >
              <Plus className="w-3 h-3" />
              Tambah Baris
            </Button>
          )}
        </div>
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
                {!isReadOnly && (
                  <>
                    <TableHead className="w-[50px] text-center">Urutan</TableHead>
                    <TableHead className="w-[50px] text-center">Hapus</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 7 : 8} className="text-center text-slate-500 py-6">
                    Belum ada data untuk kategori ini.
                  </TableCell>
                </TableRow>
              ) : items.map((item) => {
                const phase = item.phases.find((p) => p.phaseType === phaseType)
                if (!phase) return null

                const currentPhase = phaseData[phase.id]
                if (!currentPhase) return null // still initializing

                const currentRemark = itemRemarks[item.id] ?? ""
                const currentName = itemNames[item.id] ?? item.name

                const isOverdue =
                  currentPhase.status === "ON PROCESS" &&
                  currentPhase.targetETA &&
                  isBefore(startOfDay(new Date(currentPhase.targetETA)), today)

                return (
                  <TableRow key={item.id} className={isOverdue ? "bg-red-50/50 hover:bg-red-50" : ""}>
                    <TableCell className="font-medium min-w-[200px]">
                      {isReadOnly ? (
                        <span className="text-slate-900">{currentName || "-"}</span>
                      ) : (
                        <Input 
                          value={currentName}
                          onChange={(e) => handleItemNameChange(item.id, e.target.value)}
                          className="w-full h-8 text-xs sm:text-sm font-medium"
                          placeholder="Tooling Name..."
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span className="text-slate-600">{currentPhase.qty || "-"}</span>
                      ) : (
                        <Input 
                          value={currentPhase.qty} 
                          onChange={(e) => handlePhaseChange(phase.id, "qty", e.target.value)}
                          className="w-20 h-8" 
                          placeholder="e.g. 1 SET"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span className="text-slate-600">{formatDateForDisplay(currentPhase.orderDate)}</span>
                      ) : (
                        <Input 
                          type="date"
                          value={currentPhase.orderDate}
                          onChange={(e) => handlePhaseChange(phase.id, "orderDate", e.target.value)}
                          className="w-[130px] h-8"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span className={`text-slate-600 font-medium ${isOverdue ? "text-red-600" : ""}`}>
                          {formatDateForDisplay(currentPhase.targetETA)}
                        </span>
                      ) : (
                        <Input 
                          type="date"
                          value={currentPhase.targetETA}
                          onChange={(e) => handlePhaseChange(phase.id, "targetETA", e.target.value)}
                          className={`w-[130px] h-8 ${isOverdue ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}`}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span className="text-slate-600">{formatDateForDisplay(currentPhase.actualETA)}</span>
                      ) : (
                        <Input 
                          type="date"
                          value={currentPhase.actualETA}
                          onChange={(e) => handlePhaseChange(phase.id, "actualETA", e.target.value)}
                          className="w-[130px] h-8"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <StatusBadge status={currentPhase.status} />
                      ) : (
                        <Select
                          value={currentPhase.status}
                          onValueChange={(val) => { if (val) handlePhaseChange(phase.id, "status", val) }}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VERIFIED"><StatusBadge status="VERIFIED" /></SelectItem>
                            <SelectItem value="EXISTING"><StatusBadge status="EXISTING" /></SelectItem>
                            <SelectItem value="ON PROCESS"><StatusBadge status="ON PROCESS" /></SelectItem>
                            <SelectItem value="NOT USE"><StatusBadge status="NOT USE" /></SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span className="text-slate-600 max-w-[200px] truncate block" title={currentRemark || ""}>
                          {currentRemark || "-"}
                        </span>
                      ) : (
                        <Input 
                          value={currentRemark}
                          onChange={(e) => handleRemarkChange(item.id, e.target.value)}
                          className="w-[150px] h-8"
                          placeholder="Remark..."
                        />
                      )}
                    </TableCell>
                    {!isReadOnly && (
                      <>
                        <TableCell className="text-center px-1">
                          <div className="flex flex-col items-center justify-center -space-y-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => handleMoveItem(category, items.indexOf(item), 'up')}
                              disabled={items.indexOf(item) === 0}
                              className="h-6 w-6 text-slate-400 hover:text-slate-800"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => handleMoveItem(category, items.indexOf(item), 'down')}
                              disabled={items.indexOf(item) === items.length - 1}
                              className="h-6 w-6 text-slate-400 hover:text-slate-800"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
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
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Kelola Checklist: {model.name}
            {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
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
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="EXTREME">Extreme</TabsTrigger>
            <TabsTrigger value="FSR">FSR</TabsTrigger>
          </TabsList>

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

      {!isReadOnly && (
        <div className="pt-6 mt-4 border-t flex justify-end">
          <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto gap-2">
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Simpan Semua Perubahan
          </Button>
        </div>
      )}
    </div>
  )
}
