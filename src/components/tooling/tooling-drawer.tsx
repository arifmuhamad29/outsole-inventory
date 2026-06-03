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
import { Loader2, Save, X, Plus } from "lucide-react"

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
}

const BOTTOM_DEFAULTS = [
  "Gauge top net",
  "Gauge part bottom (o/s;m/s)",
  "ScribeLine",
  "Toe spring gauge",
  "Tooling mold midsole",
]

const ASSEMBLY_DEFAULTS = [
  "3D Gauge",
  "Last",
  "Back part mold",
  "Toe forming",
  "Gauge for Sockliner logo",
]

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

export function ToolingDrawer({ model, isOpen, onClose }: ToolingDrawerProps) {
  const [activeTab, setActiveTab] = useState("FSR")
  const [isPending, startTransition] = useTransition()
  
  // Form State
  const [phaseData, setPhaseData] = useState<Record<string, { qty: string, orderDate: string, targetETA: string, actualETA: string, status: string }>>({})
  const [itemRemarks, setItemRemarks] = useState<Record<string, string>>({})
  const [itemNames, setItemNames] = useState<Record<string, string>>({})
  const [newItemsList, setNewItemsList] = useState<Item[]>([])

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
    }
  }, [model])

  if (!model || !isOpen) return null

  const handleAddNewItem = (category: string) => {
    const newItemId = `new-item-${Date.now()}`
    const newPhases = ["SAMPLE", "EXTREME", "FSR"].map(pt => ({
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
        .map(([id, remark]) => ({
          id,
          name: itemNames[id] || "",
          remark: remark || null,
        })),
      newItems: newItemsList.map(ni => ({
        category: ni.category,
        name: itemNames[ni.id] || "",
        remark: itemRemarks[ni.id] || null,
        phases: ni.phases.map(p => ({
          phaseType: p.phaseType,
          qty: phaseData[p.id]?.qty || null,
          orderDate: phaseData[p.id]?.orderDate || null,
          targetETA: phaseData[p.id]?.targetETA || null,
          actualETA: phaseData[p.id]?.actualETA || null,
          status: phaseData[p.id]?.status || "ON PROCESS",
        }))
      }))
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
    const items = combinedItems.filter((i) => i.category === category)

    const today = startOfDay(new Date())

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-base">{category}</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAddNewItem(category)}
            className="h-8 gap-1 text-xs text-slate-600"
          >
            <Plus className="w-3 h-3" />
            Tambah Baris
          </Button>
        </div>
        <div className="rounded-md border bg-white overflow-hidden shadow-sm">
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
                      <Input 
                        list={category === "BOTTOM TOOLING" ? "bottom-defaults" : "assembly-defaults"}
                        value={currentName}
                        onChange={(e) => handleItemNameChange(item.id, e.target.value)}
                        className="w-full h-8 text-xs sm:text-sm font-medium"
                        placeholder="Tooling Name..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={currentPhase.qty} 
                        onChange={(e) => handlePhaseChange(phase.id, "qty", e.target.value)}
                        className="w-20 h-8" 
                        placeholder="e.g. 1 SET"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="date"
                        value={currentPhase.orderDate}
                        onChange={(e) => handlePhaseChange(phase.id, "orderDate", e.target.value)}
                        className="w-[130px] h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="date"
                        value={currentPhase.targetETA}
                        onChange={(e) => handlePhaseChange(phase.id, "targetETA", e.target.value)}
                        className={`w-[130px] h-8 ${isOverdue ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="date"
                        value={currentPhase.actualETA}
                        onChange={(e) => handlePhaseChange(phase.id, "actualETA", e.target.value)}
                        className="w-[130px] h-8"
                      />
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={currentRemark}
                        onChange={(e) => handleRemarkChange(item.id, e.target.value)}
                        className="w-[150px] h-8"
                        placeholder="Remark..."
                      />
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
      <datalist id="bottom-defaults">
        {BOTTOM_DEFAULTS.map(d => <option key={d} value={d} />)}
      </datalist>
      <datalist id="assembly-defaults">
        {ASSEMBLY_DEFAULTS.map(d => <option key={d} value={d} />)}
      </datalist>

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

      <div className="pt-6 mt-4 border-t flex justify-end">
        <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto gap-2">
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Simpan Semua Perubahan
        </Button>
      </div>
    </div>
  )
}
