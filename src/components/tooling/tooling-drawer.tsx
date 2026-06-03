"use client"

import { useState, useTransition } from "react"
import { format, isBefore, startOfDay } from "date-fns"
import { updateToolingPhaseStatus } from "@/app/actions/tooling"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import { Loader2 } from "lucide-react"

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

export function ToolingDrawer({ model, isOpen, onClose }: ToolingDrawerProps) {
  const [activeTab, setActiveTab] = useState("FSR")
  const [isPending, startTransition] = useTransition()

  if (!model) return null

  const handleStatusChange = (phaseId: string, newStatus: string) => {
    startTransition(async () => {
      await updateToolingPhaseStatus(phaseId, newStatus)
    })
  }

  const renderTable = (category: string, phaseType: string) => {
    const items = model.toolingItems.filter((i) => i.category === category)
    if (items.length === 0) return null

    const today = startOfDay(new Date())

    return (
      <div className="mb-8">
        <h3 className="font-semibold text-lg mb-3">{category}</h3>
        <div className="rounded-md border bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Tooling Name</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Target ETA</TableHead>
                <TableHead>Actual ETA</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const phase = item.phases.find((p) => p.phaseType === phaseType)
                if (!phase) return null

                // Check overdue logic
                const isOverdue =
                  phase.status === "ON PROCESS" &&
                  phase.targetETA &&
                  isBefore(startOfDay(new Date(phase.targetETA)), today)

                return (
                  <TableRow key={item.id} className={isOverdue ? "bg-red-50/50 hover:bg-red-50" : ""}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{phase.qty || "-"}</TableCell>
                    <TableCell>
                      {phase.orderDate ? format(new Date(phase.orderDate), "dd-MMM-yy") : "-"}
                    </TableCell>
                    <TableCell className={isOverdue ? "text-red-600 font-medium" : ""}>
                      {phase.targetETA ? format(new Date(phase.targetETA), "dd-MMM-yy") : "-"}
                    </TableCell>
                    <TableCell>
                      {phase.actualETA ? format(new Date(phase.actualETA), "dd-MMM-yy") : "-"}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={phase.status}
                        onValueChange={(val) => { if (val) handleStatusChange(phase.id, val) }}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-8">
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
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  const renderRemarks = (phaseType: string) => {
    // Collect remarks only for items that have the active phase
    const remarks = model.toolingItems
      .filter((i) => i.remark && i.phases.some((p) => p.phaseType === phaseType))
      .map((i) => ({ name: i.name, remark: i.remark }))

    if (remarks.length === 0) return null

    return (
      <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
        <h4 className="font-semibold text-sm mb-2 text-slate-700">Remarks:</h4>
        <ul className="text-sm space-y-1 text-slate-600 list-disc list-inside">
          {remarks.map((r, idx) => (
            <li key={idx}>
              <span className="font-medium">{r.name}:</span> {r.remark}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl flex items-center gap-2">
            {model.name}
            {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </SheetTitle>
          <SheetDescription>
            Tooling checklist tracking. Last updated: {format(new Date(model.lastUpdated), "dd MMM yyyy, HH:mm")}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="SAMPLE">Sample Size</TabsTrigger>
            <TabsTrigger value="EXTREME">Extreme Size</TabsTrigger>
            <TabsTrigger value="FSR">FSR Size</TabsTrigger>
          </TabsList>

          <TabsContent value="SAMPLE" className="mt-0">
            {renderTable("BOTTOM TOOLING", "SAMPLE")}
            {renderTable("ASSEMBLY TOOLING", "SAMPLE")}
            {renderRemarks("SAMPLE")}
          </TabsContent>

          <TabsContent value="EXTREME" className="mt-0">
            {renderTable("BOTTOM TOOLING", "EXTREME")}
            {renderTable("ASSEMBLY TOOLING", "EXTREME")}
            {renderRemarks("EXTREME")}
          </TabsContent>

          <TabsContent value="FSR" className="mt-0">
            {renderTable("BOTTOM TOOLING", "FSR")}
            {renderTable("ASSEMBLY TOOLING", "FSR")}
            {renderRemarks("FSR")}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
