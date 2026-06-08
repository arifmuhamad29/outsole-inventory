import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AppSessionProvider } from "@/components/providers/session-provider"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

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
    // Manually wipe auth cookies to prevent infinite redirect loops
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.includes("authjs") || cookie.name.includes("next-auth")) {
        cookieStore.delete(cookie.name);
      }
    }
    // Perform clean redirect outside of try-catch
    redirect("/login");
  }

  return (
    <AppSessionProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </AppSessionProvider>
  )
}
