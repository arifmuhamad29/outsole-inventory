"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { logOut } from "@/app/actions/auth"
import { LayoutDashboard, PackagePlus, ScanBarcode, ArrowRightLeft, ClipboardList, FileSpreadsheet, LogOut, Package, List, Wrench, Layers, Send, Menu, ChevronDown, ChevronUp, ShieldAlert, History, ShoppingCart, Loader2, Footprints } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role
  const permissions = session?.user?.permissions || []
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogOut = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logOut()
    } catch (error) {
      console.error("Logout failed", error)
      setIsLoggingOut(false)
    }
  }

  const adminNavItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Inventory", href: "/inventory", icon: List },
    { name: "Inbound", href: "/inbound", icon: PackagePlus },
    { name: "Outbound", href: "/outbound", icon: ScanBarcode },
    { name: "Adjustment", href: "/adjustment", icon: ArrowRightLeft },
    { name: "Stock Opname", href: "/opname", icon: ClipboardList },
    { name: "Tooling (MES)", href: "/tooling", icon: Wrench },
    { name: "BPM & TFM Stock", href: "/bpm-tfm", icon: Layers },
    { name: "Shoe Last", href: "/lasts", icon: Footprints },
    { name: "Handover", href: "/handover", icon: Send },
    { name: "Reports", href: "/reports", icon: FileSpreadsheet },
    { name: "History / Audit", href: "/history", icon: History },
    { name: "Tracking", href: "/tracking", icon: ShoppingCart },
  ]

  const operatorNavItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Inventory", href: "/inventory", icon: List },
    { name: "Outbound", href: "/outbound", icon: ScanBarcode },
    { name: "Tooling (MES)", href: "/tooling", icon: Wrench },
    { name: "BPM & TFM Stock", href: "/bpm-tfm", icon: Layers },
    { name: "Shoe Last", href: "/lasts", icon: Footprints },
    { name: "Handover", href: "/handover", icon: Send },
    { name: "History / Audit", href: "/history", icon: History },
    { name: "Tracking", href: "/tracking", icon: ShoppingCart },
  ]

  const superAdminNavItems = [
    ...adminNavItems,
    { name: "Account Control", href: "/account-control", icon: ShieldAlert },
  ]

  let baseNavItems = role === "SUPER_ADMIN" ? superAdminNavItems : (role === "ADMIN" ? adminNavItems : operatorNavItems)

  // Filter based on new granular permissions
  if (role !== "SUPER_ADMIN") {
    baseNavItems = baseNavItems.filter(item => {
      if (item.name === "Inbound" && !permissions.includes("MANAGE_INBOUND")) return false;
      if (item.name === "Outbound" && !permissions.includes("MANAGE_OUTBOUND")) return false;
      if (item.name === "History / Audit" && !permissions.includes("VIEW_HISTORY")) return false;
      if (item.name === "Tracking" && !permissions.includes("VIEW_TRACKING") && !permissions.includes("MANAGE_TRACKING")) return false;
      if (item.name === "Shoe Last" && !permissions.includes("VIEW_SHOE_LAST") && !permissions.includes("MANAGE_SHOE_LAST")) return false;
      return true;
    });
  }
  
  const navItems = baseNavItems;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-gray-900">
      
      {/* Mobile Header & Collapsible Menu */}
      <div className="flex flex-col lg:hidden w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex h-16 items-center px-6 border-b border-gray-100 dark:border-gray-700">
          <Package className="w-6 h-6 text-primary mr-2 shrink-0" />
          <div className="flex flex-col justify-center">
            <span className="font-bold text-sm leading-tight tracking-tight">DEVELOPMENT OUTSOLE INVENTORY</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                by : Arif Setiawan
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-mono font-semibold border border-primary/20 shadow-sm leading-none">
                v2.2.0
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <Collapsible open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen} className="w-full space-y-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full flex justify-between items-center bg-white dark:bg-gray-800">
                <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                  <Menu className="w-4 h-4" />
                  Menu
                </span>
                {isMobileMenuOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="mb-4 px-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{session?.user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{session?.user?.username || session?.user?.email}</p>
                </div>
                <form onSubmit={handleLogOut}>
                  <button disabled={isLoggingOut} className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors dark:text-red-400 dark:hover:bg-red-900/10 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                    {isLoggingOut ? "Signing Out..." : "Sign Out"}
                  </button>
                </form>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen shrink-0">
        <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <Package className="w-6 h-6 text-primary mr-2 shrink-0" />
          <div className="flex flex-col justify-center">
            <span className="font-bold text-sm leading-tight tracking-tight">DEVELOPMENT OUTSOLE INVENTORY</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                by : Arif Setiawan
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-mono font-semibold border border-primary/20 shadow-sm leading-none">
                v2.2.0
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex-1">
          <div className="mb-4 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{session?.user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{session?.user?.username || session?.user?.email}</p>
            <div className="mt-1 flex items-center">
               <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                 {role}
               </span>
            </div>
          </div>
          <form onSubmit={handleLogOut}>
            <button disabled={isLoggingOut} className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors dark:text-red-400 dark:hover:bg-red-900/10 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
              {isLoggingOut ? "Signing Out..." : "Sign Out"}
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
