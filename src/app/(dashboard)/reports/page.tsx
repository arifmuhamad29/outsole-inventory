"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Package,
  Layers,
  ArrowRightLeft,
  ShoppingCart,
  Download,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { downloadExcel } from "@/lib/excel"
import {
  exportInventoryData,
  exportBpmTfmData,
  exportHandoverData,
  exportTrackingData,
} from "@/app/actions/export"

type ExportKey = "inventory" | "bpmtfm" | "handover" | "tracking"

const EXPORT_CARDS: {
  key: ExportKey
  title: string
  description: string
  icon: React.ElementType
  gradient: string
  iconColor: string
}[] = [
  {
    key: "inventory",
    title: "Inventory Report",
    description:
      "Export all active inventory data including QR codes, stock levels, PO numbers, and specifications.",
    icon: Package,
    gradient: "from-violet-500/10 to-violet-600/5",
    iconColor: "text-violet-500",
  },
  {
    key: "bpmtfm",
    title: "Stock BPM & TFM",
    description:
      "Export all BPM/TFM stock data with code last, tool name, type, size, and development stock quantities.",
    icon: Layers,
    gradient: "from-blue-500/10 to-blue-600/5",
    iconColor: "text-blue-500",
  },
  {
    key: "handover",
    title: "Handover Records",
    description:
      "Export all handover transactions including recipient, giver, items, and quantities per tool.",
    icon: ArrowRightLeft,
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconColor: "text-emerald-500",
  },
  {
    key: "tracking",
    title: "Purchase Tracking",
    description:
      "Export purchase tracking data with flattened size matrix, PO status, supplier, and ETA information.",
    icon: ShoppingCart,
    gradient: "from-amber-500/10 to-amber-600/5",
    iconColor: "text-amber-500",
  },
]

function getDateSuffix() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
}

const FETCH_MAP: Record<ExportKey, () => Promise<Record<string, unknown>[]>> = {
  inventory: exportInventoryData,
  bpmtfm: exportBpmTfmData,
  handover: exportHandoverData,
  tracking: exportTrackingData,
}

const FILENAME_MAP: Record<ExportKey, string> = {
  inventory: "Inventory_Report",
  bpmtfm: "BPM_TFM_Stock",
  handover: "Handover_Records",
  tracking: "Purchase_Tracking",
}

export default function ReportsPage() {
  const [loading, setLoading] = useState<Record<ExportKey, boolean>>({
    inventory: false,
    bpmtfm: false,
    handover: false,
    tracking: false,
  })

  const handleExport = async (key: ExportKey) => {
    setLoading((prev) => ({ ...prev, [key]: true }))
    try {
      const data = await FETCH_MAP[key]()
      if (!data || data.length === 0) {
        toast.warning("No data found", {
          description: "There are no records to export for this module.",
        })
        return
      }
      downloadExcel(data, `${FILENAME_MAP[key]}_${getDateSuffix()}`)
      toast.success("Excel exported successfully!", {
        description: `${data.length} records downloaded as ${FILENAME_MAP[key]}.xlsx`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
    } catch (err) {
      console.error("Export failed:", err)
      toast.error("Export failed", {
        description: "Something went wrong. Please try again.",
      })
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20">
          <FileSpreadsheet className="h-7 w-7 text-violet-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reports & Exports
          </h1>
          <p className="text-muted-foreground mt-1">
            Download system data in Excel format (.xlsx) for analysis,
            record keeping, or external reporting.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {EXPORT_CARDS.map((card) => (
          <Card
            key={card.key}
            className="group relative overflow-hidden border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg"
          >
            {/* Gradient overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />

            <CardHeader className="relative pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-lg bg-gradient-to-br ${card.gradient} border border-border/30`}
                >
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </div>
              </div>
              <CardDescription className="pt-2 leading-relaxed">
                {card.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="relative pt-0">
              <Button
                className="w-full gap-2 font-semibold"
                variant="outline"
                disabled={loading[card.key]}
                onClick={() => handleExport(card.key)}
              >
                {loading[card.key] ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Excel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer note */}
      <div className="text-center text-xs text-muted-foreground pt-2">
        All exports include the full dataset with no pagination limits.
        Files are generated on-demand and downloaded directly to your device.
      </div>
    </div>
  )
}
