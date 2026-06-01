import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createOpnameSessionAction } from "@/app/actions/opname"
import { OpnameSessionActions } from "@/components/features/opname-actions"

export default async function OpnamePage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    redirect("/")
  }

  const sessions = await prisma.stockOpnameSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { items: true }
      }
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Opname</h1>
          <p className="text-muted-foreground mt-2">
            Manage inventory counts and reconciliations.
          </p>
        </div>

        <form action={async (formData) => {
          "use server"
          const res = await createOpnameSessionAction(formData)
          if (res.success && res.sessionId) {
            redirect(`/opname/${res.sessionId}`)
          }
        }} className="flex items-center gap-2">
          <input 
            type="text" 
            name="name" 
            placeholder="Session Name (e.g. Q1 2026)" 
            required 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button type="submit">Start New Session</Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground border rounded-lg bg-gray-50">
            No stock opname sessions found.
          </div>
        ) : (
          sessions.map((s) => (
            <Card key={s.id} className="border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{s.sessionName}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.createdAt.toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">{s._count.items} items scanned</span>
                  <div className="flex gap-2">
                    <OpnameSessionActions id={s.id} isAdmin={session?.user?.role === "ADMIN"} />
                    <Link href={`/opname/${s.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
