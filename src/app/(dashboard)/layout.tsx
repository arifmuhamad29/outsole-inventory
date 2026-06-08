import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AppSessionProvider } from "@/components/providers/session-provider"
import { auth, signOut } from "@/lib/auth"
import prisma from "@/lib/prisma"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  
  // CRITICAL SECURITY PATCH: "Live Check" for Zombie Sessions
  if (session?.user?.id) {
    const liveUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isDeleted: true }
    });
    
    // If the user no longer exists in DB or is explicitly marked as deleted
    if (!liveUser || liveUser.isDeleted) {
      // Destroy the session cookie server-side and force redirect to login
      await signOut({ redirectTo: "/login" });
    }
  }

  return (
    <AppSessionProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </AppSessionProvider>
  )
}
