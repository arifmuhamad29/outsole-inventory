"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { logOut } from "@/app/actions/auth"
import { LayoutDashboard, PackagePlus, ScanBarcode, ArrowRightLeft, ClipboardList, FileSpreadsheet, LogOut, Package } from "lucide-react"
import { cn } from "@/lib/utils"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role

  const adminNavItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Inbound", href: "/inbound", icon: PackagePlus },
    { name: "Outbound", href: "/outbound", icon: ScanBarcode },
    { name: "Adjustment", href: "/adjustment", icon: ArrowRightLeft },
    { name: "Stock Opname", href: "/opname", icon: ClipboardList },
    { name: "Reports", href: "/reports", icon: FileSpreadsheet },
  ]

  const operatorNavItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Outbound", href: "/outbound", icon: ScanBarcode },
  ]

  const navItems = role === "ADMIN" ? adminNavItems : operatorNavItems

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-auto lg:min-h-screen">
        <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <Package className="w-6 h-6 text-primary mr-2 shrink-0" />
          <div className="flex flex-col justify-center">
            <span className="font-bold text-sm leading-tight tracking-tight">DEVELOPMENT OUTSOLE INVENTORY</span>
            <span className="text-[10px] text-muted-foreground block">by : Arif Setiawan</span>
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
            <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            <div className="mt-1 flex items-center">
               <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                 {role}
               </span>
            </div>
          </div>
          <form action={logOut}>
            <button className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors dark:text-red-400 dark:hover:bg-red-900/10">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="h-16 flex items-center px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:hidden">
           <Package className="w-6 h-6 text-primary mr-2 shrink-0" />
           <div className="flex flex-col justify-center">
             <span className="font-bold text-sm leading-tight tracking-tight">DEVELOPMENT OUTSOLE INVENTORY</span>
             <span className="text-[10px] text-muted-foreground block">by : Arif Setiawan</span>
           </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
