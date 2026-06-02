import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { DashboardActions } from "@/components/features/dashboard-actions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Outsole, Transaction } from "@prisma/client"

type OutsoleWithTransactions = Outsole & {
  transactions?: Transaction[]
}

export interface InventoryTableProps {
  outsoles: OutsoleWithTransactions[];
  isAdmin?: boolean;
  readOnly?: boolean;
}

export function InventoryTable({ outsoles, isAdmin = false, readOnly = false }: InventoryTableProps) {
  return (
    <div className="rounded-md border bg-white dark:bg-gray-800 overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
          <TableRow>
            <TableHead>QR Code</TableHead>
            <TableHead>PO Number</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Article</TableHead>
            <TableHead>Color</TableHead>
            <TableHead>Bottom</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Last Outbound</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Status</TableHead>
            {!readOnly && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {outsoles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={readOnly ? 10 : 11} className="text-center h-24 text-muted-foreground">
                No inventory found matching your criteria.
              </TableCell>
            </TableRow>
          ) : (
            outsoles.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.qrCode}</TableCell>
                <TableCell>{item.poNumber || "-"}</TableCell>
                <TableCell>{item.model}</TableCell>
                <TableCell>{item.article}</TableCell>
                <TableCell>{item.color}</TableCell>
                <TableCell>{item.bottomTreatment && item.bottomTreatment !== "None" ? item.bottomTreatment : "-"}</TableCell>
                <TableCell>{item.size}</TableCell>
                <TableCell>
                  {item.transactions && item.transactions.length > 0
                    ? format(new Date(item.transactions[0].createdAt), "dd MMM yyyy, HH:mm")
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-medium">{item.stock}</TableCell>
                <TableCell>
                  {item.stock <= item.minimumStock ? (
                    <Badge variant="destructive">Low Stock</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">
                      In Stock
                    </Badge>
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <DashboardActions item={item} isAdmin={isAdmin} />
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
