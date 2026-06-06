import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { OpnameScanner } from "@/components/features/opname-scanner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function OpnameDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") redirect("/")

  const opnameSession = await prisma.stockOpnameSession.findUnique({
    where: { id },
    include: {
      items: {
        include: { outsole: true },
        orderBy: { createdAt: "desc" }
      }
    }
  })

  if (!opnameSession) notFound()

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{opnameSession.sessionName}</h1>
          <p className="text-muted-foreground mt-1">
            Created on {opnameSession.createdAt.toLocaleString()}
          </p>
        </div>
      </div>

      <OpnameScanner sessionId={opnameSession.id} />

      <div className="space-y-4 pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Scanned Items</h2>
        <div className="rounded-md border bg-white dark:bg-gray-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>QR Code</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">System Stock</TableHead>
                <TableHead className="text-right">Physical Stock</TableHead>
                <TableHead className="text-right">Discrepancy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opnameSession.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No items scanned yet.
                  </TableCell>
                </TableRow>
              ) : (
                opnameSession.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium font-mono">{item.outsole.qrCode}</TableCell>
                    <TableCell>{item.outsole.model} - {item.outsole.color} (Sz {item.outsole.size})</TableCell>
                    <TableCell className="text-right">{item.systemStock}</TableCell>
                    <TableCell className="text-right font-medium">{item.physicalStock}</TableCell>
                    <TableCell className="text-right">
                      {item.difference === 0 ? (
                        <span className="text-green-600 font-medium">Match</span>
                      ) : item.difference > 0 ? (
                        <span className="text-blue-600 font-medium">+{item.difference}</span>
                      ) : (
                        <span className="text-red-600 font-medium">{item.difference}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
