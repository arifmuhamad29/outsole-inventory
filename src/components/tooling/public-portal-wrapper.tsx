"use client"

import { useState } from "react"
import { PublicToolingView } from "@/components/tooling/public-tooling-view"
import { Package, Wrench } from "lucide-react"

export function PublicPortalWrapper({ inventoryContent }: { inventoryContent: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState("inventory")

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full items-start">
      {/* Sidebar Desktop / Horizontal Mobile */}
      <div className="w-full md:w-64 shrink-0 overflow-x-auto border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0 md:pr-4 md:min-h-[500px]">
        <nav className="flex md:flex-col gap-2 min-w-max md:min-w-0">
          <button
            onClick={() => setActiveTab("inventory")}
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
            onClick={() => setActiveTab("tooling")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "tooling" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            Tooling Tracking (MES)
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
      </div>
    </div>
  )
}
