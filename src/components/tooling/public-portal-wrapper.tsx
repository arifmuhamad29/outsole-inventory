"use client"

import { useState } from "react"
import { PublicToolingView } from "@/components/tooling/public-tooling-view"
import { PublicBpmTfmView } from "@/components/bpm-tfm/public-bpm-tfm-view"
import { PublicTrackingView } from "@/components/tracking/public-tracking-view"
import { Package, Wrench, ChevronDown, ChevronUp, Menu, Layers, ShoppingCart } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

export function PublicPortalWrapper({ inventoryContent }: { inventoryContent: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState("inventory")
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Auto-close menu on tab change (mobile)
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setIsMenuOpen(false)
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full items-start">
      {/* Mobile Collapsible Menu */}
      <div className="w-full md:hidden mb-2">
        <Collapsible
          open={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          className="w-full space-y-2"
        >
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex justify-between items-center bg-white">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <Menu className="w-4 h-4" />
                Menu
              </span>
              {isMenuOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-2 p-2 bg-white rounded-md border shadow-sm">
              <button
                onClick={() => handleTabChange("inventory")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "inventory" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                Outsole Inventory
              </button>
              <button
                onClick={() => handleTabChange("tooling")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "tooling" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Wrench className="w-4 h-4 shrink-0" />
                Tooling Tracking (MES)
              </button>
              <button
                onClick={() => handleTabChange("bpm-tfm")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "bpm-tfm" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                BPM & TFM Stock
              </button>
              <button
                onClick={() => handleTabChange("tracking")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "tracking" 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                Purchase Tracking
              </button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0 border-r border-slate-200 pr-4 min-h-[500px]">
        <nav className="flex flex-col gap-2">
          <button
            onClick={() => handleTabChange("inventory")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "inventory" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            Outsole Inventory
          </button>
          <button
            onClick={() => handleTabChange("tooling")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "tooling" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            Tooling Tracking (MES)
          </button>
          <button
            onClick={() => handleTabChange("bpm-tfm")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "bpm-tfm" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            BPM & TFM Stock
          </button>
          <button
            onClick={() => handleTabChange("tracking")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "tracking" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            Purchase Tracking
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 w-full">
        <div className={activeTab === "inventory" ? "block" : "hidden"}>
          {inventoryContent}
        </div>
        <div className={activeTab === "tooling" ? "block" : "hidden"}>
          <PublicToolingView />
        </div>
        <div className={activeTab === "bpm-tfm" ? "block" : "hidden"}>
          <PublicBpmTfmView />
        </div>
        <div className={activeTab === "tracking" ? "block animate-in fade-in zoom-in-95 duration-300" : "hidden"}>
          <PublicTrackingView />
        </div>
      </div>
    </div>
  )
}
