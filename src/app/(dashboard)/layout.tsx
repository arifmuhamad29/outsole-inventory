import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AppSessionProvider } from "@/components/providers/session-provider"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { ZombieCheck } from "@/components/auth/zombie-check"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  let isZombie = false;
  
  // CRITICAL SECURITY PATCH: "Live Check" for Zombie Sessions
  if (session?.user?.id) {
    try {
      const liveUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, isDeleted: true }
      });
      
      if (!liveUser || liveUser.isDeleted) {
        isZombie = true;
      }
    } catch (error) {
      console.error("Session live check failed:", error);
    }
  }

  if (isZombie) {
    // Redirect to the dedicated API route that has permission to wipe cookies
    redirect("/api/logout");
  }

  return (
    <AppSessionProvider>
      <ZombieCheck />
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </AppSessionProvider>
  )
}
