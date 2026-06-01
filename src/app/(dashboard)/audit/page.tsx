import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function AuditPage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    redirect("/")
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { name: true, email: true } }
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          Track all changes made to the system. Showing the last 100 records.
        </p>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {log.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{log.user.name}</div>
                    <div className="text-xs text-gray-500">{log.user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    {log.entityName} <span className="text-xs text-gray-400">({log.entityId.substring(0,8)}...)</span>
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-xs overflow-hidden text-ellipsis">
                    {log.beforeData && <div className="text-red-500">- {JSON.stringify(log.beforeData)}</div>}
                    {log.afterData && <div className="text-green-500">+ {JSON.stringify(log.afterData)}</div>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
