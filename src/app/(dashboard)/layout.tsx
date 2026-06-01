import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AppSessionProvider } from "@/components/providers/session-provider"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppSessionProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </AppSessionProvider>
  )
}
